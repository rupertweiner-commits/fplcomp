import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if user is admin
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get all allocations with user details
    const { data: allocations, error: allocationsError } = await supabase
      .from('draft_allocations')
      .select(`
        *,
        target_user:users!draft_allocations_target_user_id_fkey(id, first_name, last_name, email),
        admin_user:users!draft_allocations_admin_user_id_fkey(id, first_name, last_name, email)
      `)
      .order('allocation_round', { ascending: true })
      .order('allocation_order', { ascending: true });

    if (allocationsError) {
      throw allocationsError;
    }

    // Get all active users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .eq('is_active', true)
      .order('first_name');

    if (usersError) {
      throw usersError;
    }

    // Get available players
    const { data: availablePlayers, error: playersError } = await supabase
      .from('chelsea_players')
      .select('*')
      .eq('is_available', true)
      .order('position', { ascending: true });

    if (playersError) {
      throw playersError;
    }

    // Calculate allocation statistics
    const stats = {
      totalAllocations: allocations.length,
      totalUsers: users.length,
      totalAvailablePlayers: availablePlayers.length,
      allocatedPlayers: allocations.length,
      remainingPlayers: availablePlayers.length - allocations.length,
      usersWithCompleteTeams: users.filter(u => 
        allocations.filter(a => a.target_user_id === u.id).length === 5
      ).length
    };

    // Group allocations by user
    const allocationsByUser = {};
    users.forEach(user => {
      allocationsByUser[user.id] = {
        user,
        allocations: allocations.filter(a => a.target_user_id === user.id),
        totalValue: 0
      };
    });

    // Calculate total values
    Object.values(allocationsByUser).forEach(userData => {
      userData.totalValue = userData.allocations.reduce(
        (sum, a) => sum + parseFloat(a.player_price), 0
      );
    });

    res.status(200).json({
      success: true,
      data: {
        allocations,
        users,
        availablePlayers,
        allocationsByUser,
        stats
      }
    });

  } catch (error) {
    console.error('Failed to fetch allocations:', error);
    res.status(500).json({ 
      error: 'Failed to fetch allocations',
      details: error.message 
    });
  }
}

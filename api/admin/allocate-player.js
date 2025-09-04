import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { targetUserId, playerId, allocationRound, allocationOrder } = req.body;

    if (!targetUserId || !playerId || !allocationRound || !allocationOrder) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

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

    // Get player details
    const { data: player, error: playerError } = await supabase
      .from('chelsea_players')
      .select('*')
      .eq('id', playerId)
      .single();

    if (playerError || !player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Check if player is already allocated
    const { data: existingAllocation, error: existingError } = await supabase
      .from('draft_allocations')
      .select('*')
      .eq('player_id', playerId)
      .single();

    if (existingAllocation) {
      return res.status(400).json({ error: 'Player is already allocated' });
    }

    // Check if target user already has 5 players
    const { data: userAllocations, error: userAllocationsError } = await supabase
      .from('draft_allocations')
      .select('*')
      .eq('target_user_id', targetUserId);

    if (userAllocationsError) {
      throw userAllocationsError;
    }

    if (userAllocations.length >= 5) {
      return res.status(400).json({ error: 'User already has 5 players allocated' });
    }

    // Create allocation
    const { data: allocation, error: allocationError } = await supabase
      .from('draft_allocations')
      .insert({
        admin_user_id: user.id,
        target_user_id: targetUserId,
        player_id: playerId,
        player_name: player.name,
        player_position: player.position,
        player_price: player.price,
        allocation_round: allocationRound,
        allocation_order: allocationOrder
      })
      .select()
      .single();

    if (allocationError) {
      throw allocationError;
    }

    res.status(200).json({
      success: true,
      message: 'Player allocated successfully',
      data: allocation
    });

  } catch (error) {
    console.error('Failed to allocate player:', error);
    res.status(500).json({ 
      error: 'Failed to allocate player',
      details: error.message 
    });
  }
}

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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

    const { action } = req.query;

    switch (action) {
      case 'allocate-player':
        return await handleAllocatePlayer(req, res, user);
      case 'allocations':
        return await handleGetAllocations(req, res);
      case 'sync-status':
        return await handleSyncStatus(req, res);
      case 'sync-users':
        return await handleSyncUsers(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Admin API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function handleAllocatePlayer(req, res, user) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { targetUserId, playerId, allocationRound, allocationOrder } = req.body;

  if (!targetUserId || !playerId || !allocationRound || !allocationOrder) {
    return res.status(400).json({ error: 'Missing required fields' });
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
}

async function handleGetAllocations(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
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
}

async function handleSyncStatus(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get sync status
  const { data: syncStatus, error: statusError } = await supabase.rpc('check_user_sync_status');

  if (statusError) {
    throw statusError;
  }

  // Count different sync statuses
  const stats = {
    total: syncStatus.length,
    synced: syncStatus.filter(s => s.sync_status === 'SYNCED').length,
    missing: syncStatus.filter(s => s.sync_status === 'MISSING_IN_PUBLIC').length,
    mismatched: syncStatus.filter(s => s.sync_status === 'EMAIL_MISMATCH').length
  };

  res.status(200).json({
    success: true,
    data: {
      stats,
      details: syncStatus
    }
  });
}

async function handleSyncUsers(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Run the sync function
  const { data, error } = await supabase.rpc('sync_existing_auth_users');

  if (error) {
    throw error;
  }

  // Get sync status
  const { data: syncStatus, error: statusError } = await supabase.rpc('check_user_sync_status');

  if (statusError) {
    console.warn('Failed to get sync status:', statusError);
  }

  res.status(200).json({
    success: true,
    message: 'Users synced successfully',
    syncStatus: syncStatus || []
  });
}

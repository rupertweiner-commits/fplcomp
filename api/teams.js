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
    const { action, userId } = req.query;

    switch (action) {
      case 'user':
        return await handleUserTeam(req, res, userId);
      case 'all':
        return await handleAllTeams(req, res);
      case 'assign':
        return await handleAssignTeams(req, res);
      case 'save':
        return await handleSaveTeam(req, res);
      case 'transfer':
        return await handleTransfer(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Teams API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function handleUserTeam(req, res, userId) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }

  // Get user's team from player_ownership
  const { data: ownership, error: ownershipError } = await supabase
    .from('player_ownership')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (ownershipError) {
    throw ownershipError;
  }

  // Get user info
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError) {
    throw userError;
  }

  const team = {
    user,
    team: ownership.map(o => ({
      id: o.player_id,
      name: o.player_name,
      position: o.player_position,
      price: o.player_price
    })),
    totalValue: ownership.reduce((sum, o) => sum + parseFloat(o.player_price), 0)
  };

  res.status(200).json({
    success: true,
    data: team
  });
}

async function handleAllTeams(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get all users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .eq('is_active', true);

  if (usersError) {
    throw usersError;
  }

  // Get all teams
  const teams = await Promise.all(
    users.map(async (user) => {
      const { data: ownership, error: ownershipError } = await supabase
        .from('player_ownership')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (ownershipError) {
        console.error(`Error fetching team for user ${user.id}:`, ownershipError);
        return {
          user,
          team: [],
          totalValue: 0
        };
      }

      return {
        user,
        team: ownership.map(o => ({
          id: o.player_id,
          name: o.player_name,
          position: o.player_position,
          price: o.player_price
        })),
        totalValue: ownership.reduce((sum, o) => sum + parseFloat(o.player_price), 0)
      };
    })
  );

  res.status(200).json({
    success: true,
    data: { teams }
  });
}

async function handleAssignTeams(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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

  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (profileError || !userProfile?.is_admin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  // Get all active users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .eq('is_active', true);

  if (usersError) {
    throw usersError;
  }

  // Get available Chelsea players
  const { data: players, error: playersError } = await supabase
    .from('chelsea_players')
    .select('*')
    .eq('is_available', true);

  if (playersError) {
    throw playersError;
  }

  // Randomly assign 5 players to each user (2 defenders + 3 attackers)
  const assignments = [];
  
  for (const user of users) {
    const defenders = players.filter(p => p.position === 'DEF').sort(() => 0.5 - Math.random()).slice(0, 2);
    const attackers = players.filter(p => p.position === 'FWD').sort(() => 0.5 - Math.random()).slice(0, 3);
    const userPlayers = [...defenders, ...attackers];

    for (const player of userPlayers) {
      assignments.push({
        user_id: user.id,
        player_id: player.id,
        player_name: player.name,
        player_position: player.position,
        player_price: player.price,
        acquired_via: 'random_assignment',
        gameweek_acquired: 1
      });
    }
  }

  // Insert assignments
  const { data: insertedAssignments, error: insertError } = await supabase
    .from('player_ownership')
    .insert(assignments)
    .select();

  if (insertError) {
    throw insertError;
  }

  res.status(200).json({
    success: true,
    message: 'Teams assigned successfully',
    data: { assignments: insertedAssignments }
  });
}

async function handleSaveTeam(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, activePlayers, benchedPlayer, captain, viceCaptain, formation } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }

  // Save team lineup
  const { data: teamData, error: teamError } = await supabase
    .from('user_teams_weekly')
    .upsert({
      user_id: userId,
      gameweek: 1, // Current gameweek
      active_players: activePlayers || [],
      benched_player: benchedPlayer,
      captain: captain,
      vice_captain: viceCaptain,
      formation: formation || '4-3-3',
      total_value: 0, // Will be calculated
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (teamError) {
    throw teamError;
  }

  res.status(200).json({
    success: true,
    message: 'Team saved successfully',
    data: teamData
  });
}

async function handleTransfer(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fromUserId, toUserId, playerId, transferType, gameweek } = req.body;

  if (!fromUserId || !toUserId || !playerId) {
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

  // Create transfer record
  const { data: transfer, error: transferError } = await supabase
    .from('player_transfers')
    .insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      player_id: playerId,
      player_name: player.name,
      transfer_type: transferType || 'transfer',
      gameweek: gameweek || 1,
      transfer_cost: 0
    })
    .select()
    .single();

  if (transferError) {
    throw transferError;
  }

  res.status(200).json({
    success: true,
    message: 'Transfer completed successfully',
    data: transfer
  });
}

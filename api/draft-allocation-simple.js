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
    const { action } = req.query;

    switch (action) {
      // Draft allocation actions
      case 'get-mock-users':
        return await handleGetMockUsers(req, res);
      case 'get-available-players':
        return await handleGetAvailablePlayers(req, res);
      case 'get-allocations':
        return await handleGetAllocations(req, res);
      case 'allocate-player':
        return await handleAllocatePlayer(req, res);
      case 'remove-player':
        return await handleRemovePlayer(req, res);
      case 'set-captain':
        return await handleSetCaptain(req, res);
      case 'complete-draft':
        return await handleCompleteDraft(req, res);
      
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Draft Simple API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

// Get mock users for draft allocation
async function handleGetMockUsers(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (usersError) {
      throw usersError;
    }

    res.status(200).json({
      success: true,
      data: { users }
    });

  } catch (error) {
    console.error('Get mock users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get mock users',
      details: error.message
    });
  }
}

// Get available players (unassigned)
async function handleGetAvailablePlayers(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get ALL Chelsea players (including injured/unavailable) but only unassigned ones
    const { data: players, error: playersError } = await supabase
      .from('chelsea_players')
      .select('*')
      .is('assigned_to_user_id', null) // Only unassigned players
      .order('total_points', { ascending: false });

    if (playersError) {
      throw playersError;
    }

    // Add availability context to each player
    const playersWithContext = players.map(player => ({
      ...player,
      availability_status: getAvailabilityStatus(player),
      availability_reason: getAvailabilityReason(player),
      is_strategic_pick: isStrategicPick(player)
    }));

    res.status(200).json({
      success: true,
      data: { players: playersWithContext }
    });

  } catch (error) {
    console.error('Get available players error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get available players',
      details: error.message
    });
  }
}

// Helper function to determine availability status
function getAvailabilityStatus(player) {
  if (player.status === 'a') return 'Available';
  if (player.status === 'i') return 'Injured';
  if (player.status === 's') return 'Suspended';
  if (player.status === 'u') return 'Unavailable';
  return 'Unknown';
}

// Helper function to get availability reason
function getAvailabilityReason(player) {
  if (player.status === 'a') return 'Fully fit and ready to play';
  
  if (player.status === 'i') {
    const chance = player.chance_of_playing_this_round;
    if (chance && chance > 0) {
      return `Injured - ${chance}% chance of playing this round`;
    }
    return 'Injured - return date unknown';
  }
  
  if (player.status === 's') {
    return 'Suspended - serving ban';
  }
  
  if (player.status === 'u') {
    return 'Unavailable - reason unknown';
  }
  
  return 'Status unknown';
}

// Helper function to determine if player is a strategic pick
function isStrategicPick(player) {
  // High-value players who are temporarily unavailable
  return (player.status === 'i' || player.status === 's') && 
         player.total_points > 50 && 
         player.chance_of_playing_next_round > 50;
}

// Get current allocations
async function handleGetAllocations(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all assigned players with user details
    const { data: assignedPlayers, error: playersError } = await supabase
      .from('chelsea_players')
      .select(`
        *,
        user:user_profiles!assigned_to_user_id(*)
      `)
      .not('assigned_to_user_id', 'is', null)
      .order('assigned_to_user_id, total_points', { ascending: false });

    if (playersError) {
      throw playersError;
    }

    // Group by user
    const allocationsByUser = {};
    assignedPlayers.forEach(player => {
      if (!allocationsByUser[player.assigned_to_user_id]) {
        allocationsByUser[player.assigned_to_user_id] = {
          user: player.user,
          players: []
        };
      }
      allocationsByUser[player.assigned_to_user_id].players.push({
        id: player.id,
        fpl_id: player.fpl_id,
        name: player.name,
        position: player.position,
        price: player.price,
        total_points: player.total_points,
        is_captain: player.is_captain,
        is_vice_captain: player.is_vice_captain,
        is_available: player.is_available
      });
    });

    res.status(200).json({
      success: true,
      data: { allocations: Object.values(allocationsByUser) }
    });

  } catch (error) {
    console.error('Get allocations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get allocations',
      details: error.message
    });
  }
}

// Allocate player to user
async function handleAllocatePlayer(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { targetUserId, playerId, isCaptain = false, isViceCaptain = false } = req.body;

    if (!targetUserId || !playerId) {
      return res.status(400).json({ error: 'targetUserId and playerId are required' });
    }

    // Check if player is already assigned
    const { data: players, error: playerError } = await supabase
      .from('chelsea_players')
      .select('id, name, position, price, assigned_to_user_id')
      .eq('id', playerId);

    if (playerError) {
      throw playerError;
    }

    if (!players || players.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const existingPlayer = players[0];

    if (existingPlayer.assigned_to_user_id) {
      return res.status(400).json({ error: 'Player is already assigned to another user' });
    }

    // Check if user already has 5 players
    const { data: userPlayers, error: userPlayersError } = await supabase
      .from('chelsea_players')
      .select('id, position, is_captain, is_vice_captain')
      .eq('assigned_to_user_id', targetUserId);

    if (userPlayersError) {
      throw userPlayersError;
    }

    if (userPlayers.length >= 5) {
      return res.status(400).json({ error: 'User already has 5 players allocated. Teams must have exactly 5 players at all times.' });
    }

    // Check team composition rules
    const currentTeamPositions = userPlayers.map(p => p.position);
    const newPosition = existingPlayer.position;
    const updatedPositions = [...currentTeamPositions, newPosition];

    // Count positions
    const gkDefCount = updatedPositions.filter(pos => ['GK', 'DEF'].includes(pos)).length;
    const midFwdCount = updatedPositions.filter(pos => ['MID', 'FWD'].includes(pos)).length;

    if (gkDefCount > 2) {
      return res.status(400).json({ error: 'Team cannot have more than 2 players from GK/DEF positions' });
    }

    if (midFwdCount > 3) {
      return res.status(400).json({ error: 'Team cannot have more than 3 players from MID/FWD positions' });
    }

    // Check captain/vice captain rules
    if (isCaptain && isViceCaptain) {
      return res.status(400).json({ error: 'A player cannot be both captain and vice captain' });
    }

    // Check if user already has a captain
    if (isCaptain) {
      const existingCaptain = userPlayers.find(p => p.is_captain);
      if (existingCaptain) {
        return res.status(400).json({ error: 'User already has a captain' });
      }
    }

    // Check if user already has a vice captain
    if (isViceCaptain) {
      const existingViceCaptain = userPlayers.find(p => p.is_vice_captain);
      if (existingViceCaptain) {
        return res.status(400).json({ error: 'User already has a vice captain' });
      }
    }

    // Assign player to user
    const { data: updatedPlayers, error: updateError } = await supabase
      .from('chelsea_players')
      .update({
        assigned_to_user_id: targetUserId,
        is_captain: isCaptain,
        is_vice_captain: isViceCaptain
      })
      .eq('id', playerId)
      .select();

    if (updateError) {
      throw updateError;
    }

    if (!updatedPlayers || updatedPlayers.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const updatedPlayer = updatedPlayers[0];

    res.status(200).json({
      success: true,
      data: { 
        player: updatedPlayer,
        message: `Player ${updatedPlayer.name} assigned to user successfully`
      }
    });

  } catch (error) {
    console.error('Allocate player error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to allocate player',
      details: error.message
    });
  }
}

// Remove player from user (return to trade pile)
async function handleRemovePlayer(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { playerId } = req.body;

    if (!playerId) {
      return res.status(400).json({ error: 'playerId is required' });
    }

    // Remove player assignment
    const { data: updatedPlayers, error: updateError } = await supabase
      .from('chelsea_players')
      .update({
        assigned_to_user_id: null,
        is_captain: false,
        is_vice_captain: false
      })
      .eq('id', playerId)
      .select();

    if (updateError) {
      throw updateError;
    }

    if (!updatedPlayers || updatedPlayers.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const updatedPlayer = updatedPlayers[0];

    res.status(200).json({
      success: true,
      data: { 
        player: updatedPlayer,
        message: `Player ${updatedPlayer.name} returned to trade pile`
      }
    });

  } catch (error) {
    console.error('Remove player error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove player',
      details: error.message
    });
  }
}

// Set captain/vice captain
async function handleSetCaptain(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { playerId, isCaptain = false, isViceCaptain = false } = req.body;

    if (!playerId) {
      return res.status(400).json({ error: 'playerId is required' });
    }

    // Get current player
    const { data: players, error: playerError } = await supabase
      .from('chelsea_players')
      .select('id, name, assigned_to_user_id, is_captain, is_vice_captain')
      .eq('id', playerId);

    if (playerError) {
      throw playerError;
    }

    if (!players || players.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const player = players[0];

    if (!player.assigned_to_user_id) {
      return res.status(400).json({ error: 'Player is not assigned to any user' });
    }

    // If setting as captain, remove captain from other players
    if (isCaptain) {
      await supabase
        .from('chelsea_players')
        .update({ is_captain: false })
        .eq('assigned_to_user_id', player.assigned_to_user_id);
    }

    // If setting as vice captain, remove vice captain from other players
    if (isViceCaptain) {
      await supabase
        .from('chelsea_players')
        .update({ is_vice_captain: false })
        .eq('assigned_to_user_id', player.assigned_to_user_id);
    }

    // Update player
    const { data: updatedPlayers, error: updateError } = await supabase
      .from('chelsea_players')
      .update({
        is_captain: isCaptain,
        is_vice_captain: isViceCaptain
      })
      .eq('id', playerId)
      .select();

    if (updateError) {
      throw updateError;
    }

    if (!updatedPlayers || updatedPlayers.length === 0) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const updatedPlayer = updatedPlayers[0];

    res.status(200).json({
      success: true,
      data: { 
        player: updatedPlayer,
        message: `Player ${updatedPlayer.name} ${isCaptain ? 'set as captain' : isViceCaptain ? 'set as vice captain' : 'removed from captain/vice captain'}`
      }
    });

  } catch (error) {
    console.error('Set captain error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set captain/vice captain',
      details: error.message
    });
  }
}

// Complete draft
async function handleCompleteDraft(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if all users have exactly 5 players
    const { data: allUsers, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, username')
      .eq('is_active', true);

    if (usersError) {
      throw usersError;
    }

    const { data: allPlayers, error: playersError } = await supabase
      .from('chelsea_players')
      .select('assigned_to_user_id')
      .not('assigned_to_user_id', 'is', null);

    if (playersError) {
      throw playersError;
    }

    // Count players per user
    const playersPerUser = {};
    allPlayers.forEach(player => {
      const userId = player.assigned_to_user_id;
      playersPerUser[userId] = (playersPerUser[userId] || 0) + 1;
    });

    // Check if all users have exactly 5 players
    const incompleteUsers = allUsers.filter(user => playersPerUser[user.id] !== 5);
    
    if (incompleteUsers.length > 0) {
      return res.status(400).json({ 
        error: 'Draft cannot be completed. Some users do not have exactly 5 players.',
        incompleteUsers: incompleteUsers.map(u => u.username)
      });
    }

    // Update draft status
    const { error: statusError } = await supabase
      .from('draft_status')
      .update({
        is_draft_complete: true,
        is_draft_active: false
      })
      .eq('id', 1);

    if (statusError) {
      throw statusError;
    }

    res.status(200).json({
      success: true,
      message: 'Draft completed successfully! All users have exactly 5 players.',
      data: {
        totalUsers: allUsers.length,
        totalPlayers: allPlayers.length,
        playersPerUser: 5
      }
    });

  } catch (error) {
    console.error('Complete draft error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete draft',
      details: error.message
    });
  }
}

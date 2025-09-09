import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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
    const isAdmin = user.email === 'rupertweiner@gmail.com';
    
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { action } = req.query;

    switch (action) {
      case 'allocate-player':
        return await handleAllocatePlayer(req, res);
      case 'get-allocations':
        return await handleGetAllocations(req, res);
      case 'get-available-players':
        return await handleGetAvailablePlayers(req, res);
      case 'get-mock-users':
        return await handleGetMockUsers(req, res);
      case 'complete-draft':
        return await handleCompleteDraft(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Draft allocation API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function handleAllocatePlayer(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, playerId, isCaptain = false, isViceCaptain = false } = req.body;

  if (!userId || !playerId) {
    return res.status(400).json({ error: 'User ID and Player ID are required' });
  }

  try {
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
    const { data: existingPick, error: existingError } = await supabase
      .from('draft_picks')
      .select('*')
      .eq('player_id', playerId)
      .single();

    if (existingPick) {
      return res.status(400).json({ error: 'Player is already allocated' });
    }

    // Check if user already has 2 players (for testing purposes)
    const { data: userPicks, error: userPicksError } = await supabase
      .from('draft_picks')
      .select('*')
      .eq('user_id', userId);

    if (userPicksError) {
      throw userPicksError;
    }

    if (userPicks.length >= 2) {
      return res.status(400).json({ error: 'User already has 2 players allocated' });
    }

    // Create draft pick
    const { data: draftPick, error: draftPickError } = await supabase
      .from('draft_picks')
      .insert({
        user_id: userId,
        player_id: playerId,
        player_name: player.web_name || player.name,
        total_score: player.total_points || 0,
        gameweek_score: player.event_points || 0,
        is_captain: isCaptain,
        is_vice_captain: isViceCaptain
      })
      .select()
      .single();

    if (draftPickError) {
      throw draftPickError;
    }

    // Also create user team entry
    const { data: userTeam, error: userTeamError } = await supabase
      .from('user_teams')
      .insert({
        user_id: userId,
        player_id: playerId,
        player_name: player.web_name || player.name,
        position: player.position || 'MID',
        price: player.now_cost ? (player.now_cost / 10).toFixed(1) : '0.0',
        is_captain: isCaptain,
        is_vice_captain: isViceCaptain
      })
      .select()
      .single();

    if (userTeamError) {
      console.warn('User team creation failed:', userTeamError);
    }

    // Update draft status
    const { data: currentStatus, error: statusError } = await supabase
      .from('draft_status')
      .select('total_picks, completed_picks')
      .eq('id', 1)
      .single();

    if (!statusError && currentStatus) {
      const newTotalPicks = (currentStatus.total_picks || 0) + 1;
      const newCompletedPicks = [
        ...(currentStatus.completed_picks || []),
        {
          user_id: userId,
          player_id: playerId,
          player_name: player.web_name || player.name,
          round: Math.ceil(newTotalPicks / 3), // 3 users
          pick: newTotalPicks
        }
      ];

      await supabase
        .from('draft_status')
        .update({
          total_picks: newTotalPicks,
          completed_picks: newCompletedPicks
        })
        .eq('id', 1);
    }

    res.status(200).json({
      success: true,
      message: 'Player allocated successfully',
      data: {
        draftPick,
        userTeam
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

async function handleGetAllocations(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all draft picks with user details
    const { data: draftPicks, error: picksError } = await supabase
      .from('draft_picks')
      .select(`
        *,
        user:user_profiles!draft_picks_user_id_fkey(id, username, first_name, last_name)
      `)
      .order('created_at', { ascending: true });

    if (picksError) {
      throw picksError;
    }

    // Get draft status
    const { data: draftStatus, error: statusError } = await supabase
      .from('draft_status')
      .select('*')
      .eq('id', 1)
      .single();

    // Group picks by user
    const allocationsByUser = {};
    draftPicks.forEach(pick => {
      if (!allocationsByUser[pick.user_id]) {
        allocationsByUser[pick.user_id] = {
          user: pick.user,
          picks: [],
          totalValue: 0
        };
      }
      allocationsByUser[pick.user_id].picks.push(pick);
      allocationsByUser[pick.user_id].totalValue += parseFloat(pick.total_score || 0);
    });

    res.status(200).json({
      success: true,
      data: {
        allocations: Object.values(allocationsByUser),
        draftStatus: draftStatus || {},
        totalPicks: draftPicks.length
      }
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

async function handleGetAvailablePlayers(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all Chelsea players
    const { data: players, error: playersError } = await supabase
      .from('chelsea_players')
      .select('*')
      .eq('is_available', true)
      .order('total_points', { ascending: false });

    if (playersError) {
      throw playersError;
    }

    // Get already allocated players
    const { data: allocatedPicks, error: picksError } = await supabase
      .from('draft_picks')
      .select('player_id');

    if (picksError) {
      throw picksError;
    }

    const allocatedPlayerIds = new Set(allocatedPicks.map(pick => pick.player_id));
    const availablePlayers = players.filter(player => !allocatedPlayerIds.has(player.id));

    res.status(200).json({
      success: true,
      data: {
        players: availablePlayers,
        totalAvailable: availablePlayers.length,
        totalAllocated: allocatedPlayerIds.size
      }
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

async function handleGetMockUsers(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get mock users
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('*')
      .in('username', ['alex_manager', 'sarah_coach', 'mike_tactician'])
      .order('username');

    if (usersError) {
      throw usersError;
    }

    res.status(200).json({
      success: true,
      data: users
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

async function handleCompleteDraft(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Mark draft as complete
    const { data: draftStatus, error: statusError } = await supabase
      .from('draft_status')
      .update({
        is_draft_complete: true,
        is_draft_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1)
      .select()
      .single();

    if (statusError) {
      throw statusError;
    }

    // Mark simulation as ready
    const { data: simStatus, error: simError } = await supabase
      .from('simulation_status')
      .update({
        is_draft_complete: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1)
      .select()
      .single();

    if (simError) {
      console.warn('Simulation status update failed:', simError);
    }

    res.status(200).json({
      success: true,
      message: 'Draft completed successfully',
      data: {
        draftStatus,
        simStatus
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

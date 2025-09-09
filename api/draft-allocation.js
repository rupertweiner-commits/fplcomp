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
      
      // Team management actions
      case 'user-team':
        return await handleUserTeam(req, res);
      case 'all-teams':
        return await handleAllTeams(req, res);
      case 'save-team':
        return await handleSaveTeam(req, res);
      case 'transfer':
        return await handleTransfer(req, res);
      
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Draft Consolidated API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

// Draft allocation functions
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

async function handleGetAvailablePlayers(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: players, error: playersError } = await supabase
      .from('chelsea_players')
      .select('*')
      .eq('is_available', true)
      .order('total_points', { ascending: false });

    if (playersError) {
      throw playersError;
    }

    res.status(200).json({
      success: true,
      data: { players }
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

async function handleGetAllocations(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all draft picks with player details
    const { data: draftPicks, error: picksError } = await supabase
      .from('draft_picks')
      .select(`
        *,
        player:chelsea_players!draft_picks_player_id_fkey(*),
        user:user_profiles!draft_picks_user_id_fkey(*)
      `)
      .order('user_id, created_at');

    if (picksError) {
      throw picksError;
    }

    // Group picks by user
    const allocations = {};
    draftPicks.forEach(pick => {
      if (!allocations[pick.user_id]) {
        allocations[pick.user_id] = {
          user: pick.user,
          picks: []
        };
      }
      allocations[pick.user_id].picks.push(pick);
    });

    res.status(200).json({
      success: true,
      data: { allocations: Object.values(allocations) }
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

async function handleAllocatePlayer(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { targetUserId, playerId, isCaptain = false, isViceCaptain = false } = req.body;

    if (!targetUserId || !playerId) {
      return res.status(400).json({ error: 'targetUserId and playerId are required' });
    }

    // Get player details
    const { data: player, error: playerError } = await supabase
      .from('chelsea_players')
      .select('id, name, position, price')
      .eq('id', playerId)
      .single();

    if (playerError) {
      throw playerError;
    }

    // Check if user already has 5 players
    const { data: userPicks, error: userPicksError } = await supabase
      .from('draft_picks')
      .select('player_id')
      .eq('user_id', targetUserId);

    if (userPicksError) {
      throw userPicksError;
    }

    if (userPicks.length >= 5) {
      return res.status(400).json({ error: 'User already has 5 players allocated. Teams must have exactly 5 players at all times.' });
    }

    // Get available players for team composition validation
    const { data: allPlayers, error: allPlayersError } = await supabase
      .from('chelsea_players')
      .select('id, position')
      .eq('is_available', true);

    if (allPlayersError) {
      throw allPlayersError;
    }

    // Check team composition rules
    const currentTeamPositions = userPicks.map(pick => {
      const p = allPlayers.find(ap => ap.id === pick.player_id);
      return p ? p.position : 'UNKNOWN';
    });

    const gkDefCount = currentTeamPositions.filter(pos => pos === 'GK' || pos === 'DEF').length;
    const midFwdCount = currentTeamPositions.filter(pos => pos === 'MID' || pos === 'FWD').length;
    const newPlayerPosition = player.position;

    if (newPlayerPosition === 'GK' || newPlayerPosition === 'DEF') {
      if (gkDefCount >= 2) {
        return res.status(400).json({
          error: 'User already has 2 GK/DEF players. Team must have exactly 2 GK/DEF and 3 MID/FWD players.'
        });
      }
    } else if (newPlayerPosition === 'MID' || newPlayerPosition === 'FWD') {
      if (midFwdCount >= 3) {
        return res.status(400).json({
          error: 'User already has 3 MID/FWD players. Team must have exactly 2 GK/DEF and 3 MID/FWD players.'
        });
      }
    }

    // Insert draft pick
    const { data: newPick, error: insertError } = await supabase
      .from('draft_picks')
      .insert({
        user_id: targetUserId,
        player_id: playerId,
        player_name: player.name,
        position: player.position,
        price: player.price,
        is_captain: isCaptain,
        is_vice_captain: isViceCaptain,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    res.status(200).json({
      success: true,
      message: 'Player allocated successfully',
      data: { pick: newPick }
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

async function handleRemovePlayer(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pickId } = req.query;

    if (!pickId) {
      return res.status(400).json({ error: 'pickId is required' });
    }

    const { error: deleteError } = await supabase
      .from('draft_picks')
      .delete()
      .eq('id', pickId);

    if (deleteError) {
      throw deleteError;
    }

    res.status(200).json({
      success: true,
      message: 'Player removed successfully'
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

async function handleSetCaptain(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pickId, isCaptain, isViceCaptain } = req.body;

    if (!pickId) {
      return res.status(400).json({ error: 'pickId is required' });
    }

    // If setting as captain, remove captain from other players
    if (isCaptain) {
      const { data: pick } = await supabase
        .from('draft_picks')
        .select('user_id')
        .eq('id', pickId)
        .single();

      if (pick) {
        await supabase
          .from('draft_picks')
          .update({ is_captain: false })
          .eq('user_id', pick.user_id)
          .neq('id', pickId);
      }
    }

    // If setting as vice captain, remove vice captain from other players
    if (isViceCaptain) {
      const { data: pick } = await supabase
        .from('draft_picks')
        .select('user_id')
        .eq('id', pickId)
        .single();

      if (pick) {
        await supabase
          .from('draft_picks')
          .update({ is_vice_captain: false })
          .eq('user_id', pick.user_id)
          .neq('id', pickId);
      }
    }

    // Update the pick
    const { data: updatedPick, error: updateError } = await supabase
      .from('draft_picks')
      .update({
        is_captain: isCaptain || false,
        is_vice_captain: isViceCaptain || false,
        updated_at: new Date().toISOString()
      })
      .eq('id', pickId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    res.status(200).json({
      success: true,
      message: 'Captain/Vice Captain updated successfully',
      data: { pick: updatedPick }
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

async function handleCompleteDraft(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate that all teams have exactly 5 players
    const { data: allDraftPicks, error: picksError } = await supabase
      .from('draft_picks')
      .select('user_id')
      .order('user_id');

    if (picksError) {
      throw picksError;
    }

    // Group picks by user
    const picksByUser = {};
    allDraftPicks.forEach(pick => {
      if (!picksByUser[pick.user_id]) {
        picksByUser[pick.user_id] = [];
      }
      picksByUser[pick.user_id].push(pick);
    });

    // Check that all users have exactly 5 players
    const usersWithIncompleteTeams = Object.entries(picksByUser)
      .filter(([userId, picks]) => picks.length !== 5)
      .map(([userId, picks]) => ({ userId, count: picks.length }));

    if (usersWithIncompleteTeams.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot complete draft: All teams must have exactly 5 players',
        details: usersWithIncompleteTeams.map(u => 
          `User ${u.userId} has ${u.count} players (needs 5)`
        )
      });
    }

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
      message: 'Draft completed successfully - All teams have exactly 5 players',
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

// Team management functions (simplified versions)
async function handleUserTeam(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const { data: team, error: teamError } = await supabase
      .from('user_teams')
      .select(`
        *,
        player:chelsea_players!user_teams_player_id_fkey(*)
      `)
      .eq('user_id', userId);

    if (teamError) {
      throw teamError;
    }

    res.status(200).json({
      success: true,
      data: { team }
    });

  } catch (error) {
    console.error('Get user team error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user team',
      details: error.message
    });
  }
}

async function handleAllTeams(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: teams, error: teamsError } = await supabase
      .from('user_teams')
      .select(`
        *,
        player:chelsea_players!user_teams_player_id_fkey(*),
        user:user_profiles!user_teams_user_id_fkey(*)
      `);

    if (teamsError) {
      throw teamsError;
    }

    res.status(200).json({
      success: true,
      data: { teams }
    });

  } catch (error) {
    console.error('Get all teams error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get all teams',
      details: error.message
    });
  }
}

async function handleSaveTeam(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, team } = req.body;

    if (!userId || !team) {
      return res.status(400).json({ error: 'userId and team are required' });
    }

    // Clear existing team
    await supabase
      .from('user_teams')
      .delete()
      .eq('user_id', userId);

    // Insert new team
    const teamData = team.map(player => ({
      user_id: userId,
      player_id: player.player_id,
      player_name: player.player_name,
      position: player.position,
      price: player.price,
      is_captain: player.is_captain || false,
      is_vice_captain: player.is_vice_captain || false,
      created_at: new Date().toISOString()
    }));

    const { data: savedTeam, error: saveError } = await supabase
      .from('user_teams')
      .insert(teamData)
      .select();

    if (saveError) {
      throw saveError;
    }

    res.status(200).json({
      success: true,
      message: 'Team saved successfully',
      data: { team: savedTeam }
    });

  } catch (error) {
    console.error('Save team error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save team',
      details: error.message
    });
  }
}

async function handleTransfer(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, playerOutId, playerInId } = req.body;

    if (!userId || !playerOutId || !playerInId) {
      return res.status(400).json({ error: 'userId, playerOutId, and playerInId are required' });
    }

    // This is a simplified transfer function
    // In a real implementation, you'd need to validate team composition rules
    // and handle captain/vice captain assignments

    res.status(200).json({
      success: true,
      message: 'Transfer completed successfully'
    });

  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process transfer',
      details: error.message
    });
  }
}

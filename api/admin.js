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
      case 'validate-team':
        return await handleValidateTeam(req, res);
      case 'validate-all-teams':
        return await handleValidateAllTeams(req, res);
      case 'enforce-composition':
        return await handleEnforceComposition(req, res);
      case 'get-stats':
        return await handleGetStats(req, res);
      case 'reset-draft':
        return await handleResetDraft(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Admin Consolidated API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

async function handleValidateTeam(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Get user's current team
    const { data: userTeam, error: teamError } = await supabase
      .from('user_teams')
      .select(`
        *,
        player:chelsea_players!user_teams_player_id_fkey(id, position, web_name)
      `)
      .eq('user_id', userId);

    if (teamError) {
      throw teamError;
    }

    // Check if team has exactly 5 players
    if (userTeam.length !== 5) {
      return res.status(200).json({
        isValid: false,
        error: `Team must have exactly 5 players. Current: ${userTeam.length}`,
        currentCount: userTeam.length,
        requiredCount: 5
      });
    }

    // Check team composition
    const gkDefCount = userTeam.filter(player => 
      player.player && (player.player.position === 'GK' || player.player.position === 'DEF')
    ).length;

    const midFwdCount = userTeam.filter(player => 
      player.player && (player.player.position === 'MID' || player.player.position === 'FWD')
    ).length;

    if (gkDefCount !== 2) {
      return res.status(200).json({
        isValid: false,
        error: `Team must have exactly 2 GK/DEF players. Current: ${gkDefCount}`,
        gkDefCount,
        requiredGkDef: 2
      });
    }

    if (midFwdCount !== 3) {
      return res.status(200).json({
        isValid: false,
        error: `Team must have exactly 3 MID/FWD players. Current: ${midFwdCount}`,
        midFwdCount,
        requiredMidFwd: 3
      });
    }

    // Check captain and vice captain
    const captainCount = userTeam.filter(player => player.is_captain).length;
    const viceCaptainCount = userTeam.filter(player => player.is_vice_captain).length;

    if (captainCount !== 1) {
      return res.status(200).json({
        isValid: false,
        error: `Team must have exactly 1 captain. Current: ${captainCount}`,
        captainCount,
        requiredCaptains: 1
      });
    }

    if (viceCaptainCount !== 1) {
      return res.status(200).json({
        isValid: false,
        error: `Team must have exactly 1 vice captain. Current: ${viceCaptainCount}`,
        viceCaptainCount,
        requiredViceCaptains: 1
      });
    }

    res.status(200).json({
      isValid: true,
      message: 'Team composition is valid',
      composition: {
        totalPlayers: 5,
        gkDef: gkDefCount,
        midFwd: midFwdCount,
        captains: captainCount,
        viceCaptains: viceCaptainCount
      }
    });

  } catch (error) {
    console.error('Team validation error:', error);
    res.status(500).json({
      isValid: false,
      error: 'Failed to validate team composition',
      details: error.message
    });
  }
}

async function handleValidateAllTeams(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, username')
      .eq('is_active', true);

    if (usersError) {
      throw usersError;
    }

    const validationResults = [];

    for (const user of users) {
      // Get user's team
      const { data: userTeam, error: teamError } = await supabase
        .from('user_teams')
        .select(`
          *,
          player:chelsea_players!user_teams_player_id_fkey(id, position, web_name)
        `)
        .eq('user_id', user.id);

      if (teamError) {
        validationResults.push({
          userId: user.id,
          username: user.username,
          isValid: false,
          error: 'Failed to fetch team data'
        });
        continue;
      }

      // Validate team
      const isValid = userTeam.length === 5;
      const gkDefCount = userTeam.filter(player => 
        player.player && (player.player.position === 'GK' || player.player.position === 'DEF')
      ).length;
      const midFwdCount = userTeam.filter(player => 
        player.player && (player.player.position === 'MID' || player.player.position === 'FWD')
      ).length;

      validationResults.push({
        userId: user.id,
        username: user.username,
        isValid,
        playerCount: userTeam.length,
        gkDefCount,
        midFwdCount,
        error: !isValid ? `Team has ${userTeam.length} players (needs 5)` : null
      });
    }

    const validTeams = validationResults.filter(result => result.isValid).length;
    const invalidTeams = validationResults.filter(result => !result.isValid).length;

    res.status(200).json({
      totalTeams: users.length,
      validTeams,
      invalidTeams,
      results: validationResults,
      allTeamsValid: invalidTeams === 0
    });

  } catch (error) {
    console.error('All teams validation error:', error);
    res.status(500).json({
      totalTeams: 0,
      validTeams: 0,
      invalidTeams: 0,
      results: [],
      allTeamsValid: false,
      error: 'Failed to validate all teams',
      details: error.message
    });
  }
}

async function handleEnforceComposition(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, newPlayerId, isCaptain = false, isViceCaptain = false } = req.body;

    if (!userId || !newPlayerId) {
      return res.status(400).json({ error: 'userId and newPlayerId are required' });
    }

    // Get current team
    const { data: currentTeam, error: teamError } = await supabase
      .from('user_teams')
      .select('*')
      .eq('user_id', userId);

    if (teamError) {
      throw teamError;
    }

    // If team already has 5 players, we need to remove one
    if (currentTeam.length >= 5) {
      return res.status(200).json({
        canAdd: false,
        error: 'Team already has 5 players. Cannot add more players without removing one first.',
        currentCount: currentTeam.length,
        maxCount: 5
      });
    }

    // Get player details
    const { data: player, error: playerError } = await supabase
      .from('chelsea_players')
      .select('*')
      .eq('id', newPlayerId)
      .single();

    if (playerError || !player) {
      return res.status(200).json({
        canAdd: false,
        error: 'Player not found'
      });
    }

    // Check team composition rules
    const gkDefCount = currentTeam.filter(player => 
      player.position === 'GK' || player.position === 'DEF'
    ).length;

    const midFwdCount = currentTeam.filter(player => 
      player.position === 'MID' || player.position === 'FWD'
    ).length;

    const newPlayerPosition = player.position;

    // Validate composition
    if (newPlayerPosition === 'GK' || newPlayerPosition === 'DEF') {
      if (gkDefCount >= 2) {
        return res.status(200).json({
          canAdd: false,
          error: 'Team already has 2 GK/DEF players. Maximum allowed: 2',
          currentGkDef: gkDefCount,
          maxGkDef: 2
        });
      }
    } else if (newPlayerPosition === 'MID' || newPlayerPosition === 'FWD') {
      if (midFwdCount >= 3) {
        return res.status(200).json({
          canAdd: false,
          error: 'Team already has 3 MID/FWD players. Maximum allowed: 3',
          currentMidFwd: midFwdCount,
          maxMidFwd: 3
        });
      }
    }

    res.status(200).json({
      canAdd: true,
      message: 'Player can be added to team',
      newComposition: {
        totalPlayers: currentTeam.length + 1,
        gkDef: newPlayerPosition === 'GK' || newPlayerPosition === 'DEF' ? gkDefCount + 1 : gkDefCount,
        midFwd: newPlayerPosition === 'MID' || newPlayerPosition === 'FWD' ? midFwdCount + 1 : midFwdCount
      }
    });

  } catch (error) {
    console.error('Enforce team composition error:', error);
    res.status(500).json({
      canAdd: false,
      error: 'Failed to validate team composition',
      details: error.message
    });
  }
}

async function handleGetStats(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get various stats
    const [
      { count: totalUsers },
      { count: totalPlayers },
      { count: totalDraftPicks },
      { data: draftStatus }
    ] = await Promise.all([
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('chelsea_players').select('*', { count: 'exact', head: true }),
      supabase.from('draft_picks').select('*', { count: 'exact', head: true }),
      supabase.from('draft_status').select('*').eq('id', 1).single()
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalPlayers,
        totalDraftPicks,
        draftStatus
      }
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stats',
      details: error.message
    });
  }
}

async function handleResetDraft(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Clear all draft picks
    await supabase.from('draft_picks').delete().neq('id', 0);
    
    // Reset draft status
    await supabase
      .from('draft_status')
      .update({
        is_draft_complete: false,
        is_draft_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1);

    res.status(200).json({
      success: true,
      message: 'Draft reset successfully'
    });

  } catch (error) {
    console.error('Reset draft error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset draft',
      details: error.message
    });
  }
}

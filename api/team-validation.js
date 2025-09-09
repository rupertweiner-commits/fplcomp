import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function validateTeamComposition(userId) {
  try {
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
      return {
        isValid: false,
        error: `Team must have exactly 5 players. Current: ${userTeam.length}`,
        currentCount: userTeam.length,
        requiredCount: 5
      };
    }

    // Check team composition
    const gkDefCount = userTeam.filter(player => 
      player.player && (player.player.position === 'GK' || player.player.position === 'DEF')
    ).length;

    const midFwdCount = userTeam.filter(player => 
      player.player && (player.player.position === 'MID' || player.player.position === 'FWD')
    ).length;

    if (gkDefCount !== 2) {
      return {
        isValid: false,
        error: `Team must have exactly 2 GK/DEF players. Current: ${gkDefCount}`,
        gkDefCount,
        requiredGkDef: 2
      };
    }

    if (midFwdCount !== 3) {
      return {
        isValid: false,
        error: `Team must have exactly 3 MID/FWD players. Current: ${midFwdCount}`,
        midFwdCount,
        requiredMidFwd: 3
      };
    }

    // Check captain and vice captain
    const captainCount = userTeam.filter(player => player.is_captain).length;
    const viceCaptainCount = userTeam.filter(player => player.is_vice_captain).length;

    if (captainCount !== 1) {
      return {
        isValid: false,
        error: `Team must have exactly 1 captain. Current: ${captainCount}`,
        captainCount,
        requiredCaptains: 1
      };
    }

    if (viceCaptainCount !== 1) {
      return {
        isValid: false,
        error: `Team must have exactly 1 vice captain. Current: ${viceCaptainCount}`,
        viceCaptainCount,
        requiredViceCaptains: 1
      };
    }

    return {
      isValid: true,
      message: 'Team composition is valid',
      composition: {
        totalPlayers: 5,
        gkDef: gkDefCount,
        midFwd: midFwdCount,
        captains: captainCount,
        viceCaptains: viceCaptainCount
      }
    };

  } catch (error) {
    console.error('Team validation error:', error);
    return {
      isValid: false,
      error: 'Failed to validate team composition',
      details: error.message
    };
  }
}

export async function validateAllTeams() {
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
      const validation = await validateTeamComposition(user.id);
      validationResults.push({
        userId: user.id,
        username: user.username,
        ...validation
      });
    }

    const validTeams = validationResults.filter(result => result.isValid).length;
    const invalidTeams = validationResults.filter(result => !result.isValid).length;

    return {
      totalTeams: users.length,
      validTeams,
      invalidTeams,
      results: validationResults,
      allTeamsValid: invalidTeams === 0
    };

  } catch (error) {
    console.error('All teams validation error:', error);
    return {
      totalTeams: 0,
      validTeams: 0,
      invalidTeams: 0,
      results: [],
      allTeamsValid: false,
      error: 'Failed to validate all teams',
      details: error.message
    };
  }
}

export async function enforceTeamComposition(userId, newPlayerId, isCaptain = false, isViceCaptain = false) {
  try {
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
      return {
        canAdd: false,
        error: 'Team already has 5 players. Cannot add more players without removing one first.',
        currentCount: currentTeam.length,
        maxCount: 5
      };
    }

    // Get player details
    const { data: player, error: playerError } = await supabase
      .from('chelsea_players')
      .select('*')
      .eq('id', newPlayerId)
      .single();

    if (playerError || !player) {
      return {
        canAdd: false,
        error: 'Player not found'
      };
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
        return {
          canAdd: false,
          error: 'Team already has 2 GK/DEF players. Maximum allowed: 2',
          currentGkDef: gkDefCount,
          maxGkDef: 2
        };
      }
    } else if (newPlayerPosition === 'MID' || newPlayerPosition === 'FWD') {
      if (midFwdCount >= 3) {
        return {
          canAdd: false,
          error: 'Team already has 3 MID/FWD players. Maximum allowed: 3',
          currentMidFwd: midFwdCount,
          maxMidFwd: 3
        };
      }
    }

    // Check captain/vice captain rules
    if (isCaptain) {
      const existingCaptains = currentTeam.filter(player => player.is_captain).length;
      if (existingCaptains >= 1) {
        return {
          canAdd: false,
          error: 'Team already has a captain. Only one captain allowed.',
          currentCaptains: existingCaptains,
          maxCaptains: 1
        };
      }
    }

    if (isViceCaptain) {
      const existingViceCaptains = currentTeam.filter(player => player.is_vice_captain).length;
      if (existingViceCaptains >= 1) {
        return {
          canAdd: false,
          error: 'Team already has a vice captain. Only one vice captain allowed.',
          currentViceCaptains: existingViceCaptains,
          maxViceCaptains: 1
        };
      }
    }

    return {
      canAdd: true,
      message: 'Player can be added to team',
      newComposition: {
        totalPlayers: currentTeam.length + 1,
        gkDef: newPlayerPosition === 'GK' || newPlayerPosition === 'DEF' ? gkDefCount + 1 : gkDefCount,
        midFwd: newPlayerPosition === 'MID' || newPlayerPosition === 'FWD' ? midFwdCount + 1 : midFwdCount
      }
    };

  } catch (error) {
    console.error('Enforce team composition error:', error);
    return {
      canAdd: false,
      error: 'Failed to validate team composition',
      details: error.message
    };
  }
}

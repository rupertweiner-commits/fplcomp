import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { action, gameweek, season = '2024-25', userId } = req.query;

  try {
    switch (action) {
      case 'get-player-scores':
        return await handleGetPlayerScores(req, res, gameweek, season);
      case 'get-user-team-scores':
        return await handleGetUserTeamScores(req, res, gameweek, season);
      case 'get-gameweek-breakdown':
        return await handleGetGameweekBreakdown(req, res, gameweek, season);
      case 'get-player-ownership-history':
        return await handleGetPlayerOwnershipHistory(req, res, userId, season);
      case 'calculate-weekly-scores':
        return await handleCalculateWeeklyScores(req, res, gameweek, season);
      default:
        return res.status(400).json({ 
          error: 'Invalid action', 
          availableActions: [
            'get-player-scores', 'get-user-team-scores', 'get-gameweek-breakdown',
            'get-player-ownership-history', 'calculate-weekly-scores'
          ]
        });
    }
  } catch (error) {
    console.error('Player ownership scores API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

// Get individual player scores for a specific gameweek
async function handleGetPlayerScores(req, res, gameweek, season) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: playerScores, error } = await supabase
      .from('player_gameweek_performance')
      .select(`
        *,
        player:chelsea_players!player_gameweek_performance_player_id_fkey(
          id, name, position, price
        )
      `)
      .eq('gameweek', parseInt(gameweek))
      .eq('season', season)
      .order('total_points', { ascending: false });

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      data: playerScores,
      gameweek: parseInt(gameweek),
      season
    });

  } catch (error) {
    console.error('Get player scores error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get player scores',
      details: error.message
    });
  }
}

// Get user team scores for a specific gameweek
async function handleGetUserTeamScores(req, res, gameweek, season) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user gameweek scores
    const { data: userScores, error: scoresError } = await supabase
      .from('user_gameweek_scores')
      .select(`
        *,
        user:user_profiles!user_gameweek_scores_user_id_fkey(
          id, first_name, last_name, email
        )
      `)
      .eq('gameweek', parseInt(gameweek))
      .eq('season', season)
      .order('total_points', { ascending: false });

    if (scoresError) {
      throw scoresError;
    }

    // Get team snapshots for detailed breakdown
    const { data: teamSnapshots, error: snapshotsError } = await supabase
      .from('user_team_snapshots')
      .select(`
        user_id,
        team_composition,
        formation,
        transfers_made,
        transfer_cost,
        chip_used,
        chip_points
      `)
      .eq('gameweek', parseInt(gameweek))
      .eq('season', season);

    if (snapshotsError) {
      console.warn('Could not fetch team snapshots:', snapshotsError);
    }

    // Combine user scores with team details
    const detailedScores = userScores.map(score => {
      const teamSnapshot = teamSnapshots?.find(snapshot => 
        snapshot.user_id === score.user_id
      );

      return {
        ...score,
        team_details: teamSnapshot || null
      };
    });

    res.status(200).json({
      success: true,
      data: detailedScores,
      gameweek: parseInt(gameweek),
      season
    });

  } catch (error) {
    console.error('Get user team scores error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user team scores',
      details: error.message
    });
  }
}

// Get complete gameweek breakdown (players + ownership + scores)
async function handleGetGameweekBreakdown(req, res, gameweek, season) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get player performance for this gameweek
    const { data: playerPerformance, error: perfError } = await supabase
      .from('player_gameweek_performance')
      .select(`
        *,
        player:chelsea_players!player_gameweek_performance_player_id_fkey(
          id, name, position, price
        )
      `)
      .eq('gameweek', parseInt(gameweek))
      .eq('season', season)
      .order('total_points', { ascending: false });

    if (perfError) {
      throw perfError;
    }

    // Get user team snapshots to see who owned each player
    const { data: teamSnapshots, error: snapshotsError } = await supabase
      .from('user_team_snapshots')
      .select(`
        user_id,
        team_composition,
        user:user_profiles!user_team_snapshots_user_id_fkey(
          id, first_name, last_name, email
        )
      `)
      .eq('gameweek', parseInt(gameweek))
      .eq('season', season);

    if (snapshotsError) {
      throw snapshotsError;
    }

    // Create ownership map
    const playerOwnership = {};
    teamSnapshots.forEach(snapshot => {
      if (snapshot.team_composition) {
        snapshot.team_composition.forEach(player => {
          if (!playerOwnership[player.player_id]) {
            playerOwnership[player.player_id] = [];
          }
          playerOwnership[player.player_id].push({
            user_id: snapshot.user_id,
            user: snapshot.user,
            is_captain: player.is_captain,
            is_vice_captain: player.is_vice_captain,
            position: player.position
          });
        });
      }
    });

    // Enhance player performance with ownership data
    const enhancedPlayers = playerPerformance.map(player => ({
      ...player,
      ownership: playerOwnership[player.player_id] || [],
      total_owners: (playerOwnership[player.player_id] || []).length,
      captain_owners: (playerOwnership[player.player_id] || [])
        .filter(owner => owner.is_captain).length,
      vice_captain_owners: (playerOwnership[player.player_id] || [])
        .filter(owner => owner.is_vice_captain).length
    }));

    res.status(200).json({
      success: true,
      data: {
        gameweek: parseInt(gameweek),
        season,
        players: enhancedPlayers,
        total_players: enhancedPlayers.length,
        total_owners: teamSnapshots.length
      }
    });

  } catch (error) {
    console.error('Get gameweek breakdown error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get gameweek breakdown',
      details: error.message
    });
  }
}

// Get player ownership history for a specific user
async function handleGetPlayerOwnershipHistory(req, res, userId, season) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // Get user's team snapshots across all gameweeks
    const { data: teamSnapshots, error: snapshotsError } = await supabase
      .from('user_team_snapshots')
      .select('*')
      .eq('user_id', userId)
      .eq('season', season)
      .order('gameweek');

    if (snapshotsError) {
      throw snapshotsError;
    }

    // Get player performance data for all gameweeks
    const { data: playerPerformance, error: perfError } = await supabase
      .from('player_gameweek_performance')
      .select('*')
      .eq('season', season)
      .order('gameweek, total_points', { ascending: false });

    if (perfError) {
      throw perfError;
    }

    // Create ownership history
    const ownershipHistory = [];
    
    teamSnapshots.forEach(snapshot => {
      if (snapshot.team_composition) {
        snapshot.team_composition.forEach(teamPlayer => {
          const playerPerf = playerPerformance.find(perf => 
            perf.player_id === teamPlayer.player_id && 
            perf.gameweek === snapshot.gameweek
          );

          if (playerPerf) {
            ownershipHistory.push({
              gameweek: snapshot.gameweek,
              player_id: teamPlayer.player_id,
              player_name: teamPlayer.player_name,
              position: teamPlayer.position,
              is_captain: teamPlayer.is_captain,
              is_vice_captain: teamPlayer.is_vice_captain,
              player_points: playerPerf.total_points,
              user_points: teamPlayer.is_captain ? playerPerf.total_points * 2 :
                          teamPlayer.is_vice_captain ? playerPerf.total_points * 1.5 :
                          playerPerf.total_points,
              goals_scored: playerPerf.goals_scored,
              assists: playerPerf.assists,
              clean_sheets: playerPerf.clean_sheets,
              bonus_points: playerPerf.bonus_points
            });
          }
        });
      }
    });

    res.status(200).json({
      success: true,
      data: {
        user_id: userId,
        season,
        ownership_history: ownershipHistory,
        total_gameweeks: teamSnapshots.length,
        total_players_owned: ownershipHistory.length
      }
    });

  } catch (error) {
    console.error('Get player ownership history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get player ownership history',
      details: error.message
    });
  }
}

// Calculate weekly scores for all users (admin function)
async function handleCalculateWeeklyScores(req, res, gameweek, season) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log(`🔄 Calculating weekly scores for gameweek ${gameweek}...`);

    // Get player performance for this gameweek
    const { data: playerPerformance, error: perfError } = await supabase
      .from('player_gameweek_performance')
      .select('*')
      .eq('gameweek', parseInt(gameweek))
      .eq('season', season);

    if (perfError) {
      throw perfError;
    }

    if (!playerPerformance || playerPerformance.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No player performance data found for this gameweek'
      });
    }

    // Get all user team snapshots for this gameweek
    const { data: teamSnapshots, error: snapshotsError } = await supabase
      .from('user_team_snapshots')
      .select(`
        user_id,
        team_composition,
        user:user_profiles!user_team_snapshots_user_id_fkey(
          id, first_name, last_name, email
        )
      `)
      .eq('gameweek', parseInt(gameweek))
      .eq('season', season);

    if (snapshotsError) {
      throw snapshotsError;
    }

    const results = [];

    // Calculate scores for each user
    for (const snapshot of teamSnapshots) {
      if (!snapshot.team_composition) continue;

      let totalPoints = 0;
      let startingXiPoints = 0;
      let captainPoints = 0;
      let viceCaptainPoints = 0;
      const playerBreakdown = [];

      snapshot.team_composition.forEach(teamPlayer => {
        const playerPerf = playerPerformance.find(perf => 
          perf.player_id === teamPlayer.player_id
        );

        if (playerPerf) {
          const basePoints = playerPerf.total_points;
          let userPoints = basePoints;

          if (teamPlayer.is_captain) {
            userPoints = basePoints * 2;
            captainPoints = basePoints;
          } else if (teamPlayer.is_vice_captain) {
            userPoints = basePoints * 1.5;
            viceCaptainPoints = basePoints * 0.5;
          }

          startingXiPoints += basePoints;
          totalPoints += userPoints;

          playerBreakdown.push({
            player_id: teamPlayer.player_id,
            player_name: teamPlayer.player_name,
            position: teamPlayer.position,
            is_captain: teamPlayer.is_captain,
            is_vice_captain: teamPlayer.is_vice_captain,
            base_points: basePoints,
            user_points: userPoints,
            goals_scored: playerPerf.goals_scored,
            assists: playerPerf.assists,
            clean_sheets: playerPerf.clean_sheets,
            bonus_points: playerPerf.bonus_points
          });
        }
      });

      // Store user gameweek score
      const { error: scoreError } = await supabase
        .from('user_gameweek_scores')
        .upsert({
          user_id: snapshot.user_id,
          gameweek: parseInt(gameweek),
          season,
          total_points: totalPoints,
          starting_xi_points: startingXiPoints,
          captain_points: captainPoints,
          vice_captain_points: viceCaptainPoints,
          bench_points: 0,
          chip_used: null,
          chip_points: 0,
          transfer_cost: 0,
          calculated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,gameweek,season'
        });

      if (scoreError) {
        console.error(`❌ Score storage error for user ${snapshot.user_id}:`, scoreError);
      }

      results.push({
        user_id: snapshot.user_id,
        user: snapshot.user,
        total_points: totalPoints,
        starting_xi_points: startingXiPoints,
        captain_points: captainPoints,
        vice_captain_points: viceCaptainPoints,
        player_breakdown: playerBreakdown
      });
    }

    console.log(`✅ Weekly scores calculated for ${results.length} users`);

    res.status(200).json({
      success: true,
      message: `Weekly scores calculated for gameweek ${gameweek}`,
      data: {
        gameweek: parseInt(gameweek),
        season,
        results
      }
    });

  } catch (error) {
    console.error('Calculate weekly scores error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate weekly scores',
      details: error.message
    });
  }
}

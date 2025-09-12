import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  const { action, gameweek, season = '2024-25', userId } = req.query;

  try {
    switch (action) {
      case 'get-user-scores':
        return await handleGetUserScores(req, res, userId, gameweek, season);
      case 'get-gameweek-leaderboard':
        return await handleGetGameweekLeaderboard(req, res, gameweek, season);
      case 'get-user-history':
        return await handleGetUserHistory(req, res, userId, season);
      case 'get-player-performance':
        return await handleGetPlayerPerformance(req, res, gameweek, season);
      case 'get-season-overview':
        return await handleGetSeasonOverview(req, res, season);
      case 'calculate-gameweek-scores':
        return await handleCalculateGameweekScores(req, res, gameweek, season);
      case 'get-user-team-snapshot':
        return await handleGetUserTeamSnapshot(req, res, userId, gameweek, season);
      case 'get-transfer-history':
        return await handleGetTransferHistory(req, res, userId, season);
      case 'get-chip-history':
        return await handleGetChipHistory(req, res, userId, season);
      default:
        return res.status(400).json({ 
          error: 'Invalid action', 
          availableActions: [
            'get-user-scores', 'get-gameweek-leaderboard', 'get-user-history',
            'get-player-performance', 'get-season-overview', 'calculate-gameweek-scores',
            'get-user-team-snapshot', 'get-transfer-history', 'get-chip-history'
          ]
        });
    }
  } catch (error) {
    console.error('Gameweek scores API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

// Get user's scores for a specific gameweek or all gameweeks
async function handleGetUserScores(req, res, userId, gameweek, season) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let query = supabase
      .from('user_gameweek_scores')
      .select(`
        *,
        user:user_profiles!user_gameweek_scores_user_id_fkey(
          id, first_name, last_name, email
        )
      `)
      .eq('season', season);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (gameweek) {
      query = query.eq('gameweek', parseInt(gameweek));
    }

    const { data: scores, error } = await query.order('total_points', { ascending: false });

    if (error) {
      throw error;
    }

    // Add rank for each gameweek
    const scoresWithRank = scores.map((score, index) => ({
      ...score,
      rank: index + 1
    }));

    res.status(200).json({
      success: true,
      data: scoresWithRank,
      count: scores.length
    });

  } catch (error) {
    console.error('Get user scores error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user scores',
      details: error.message
    });
  }
}

// Get leaderboard for a specific gameweek
async function handleGetGameweekLeaderboard(req, res, gameweek, season) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: rankings, error } = await supabase
      .from('gameweek_rankings')
      .select(`
        *,
        user:user_profiles!gameweek_rankings_user_id_fkey(
          id, first_name, last_name, email
        )
      `)
      .eq('gameweek', parseInt(gameweek))
      .eq('season', season)
      .order('rank');

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      data: rankings,
      gameweek: parseInt(gameweek),
      season
    });

  } catch (error) {
    console.error('Get gameweek leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get gameweek leaderboard',
      details: error.message
    });
  }
}

// Get user's complete history across all gameweeks
async function handleGetUserHistory(req, res, userId, season) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // Get user's gameweek scores
    const { data: scores, error: scoresError } = await supabase
      .from('user_gameweek_scores')
      .select('*')
      .eq('user_id', userId)
      .eq('season', season)
      .order('gameweek');

    if (scoresError) {
      throw scoresError;
    }

    // Get user's total points
    const { data: totals, error: totalsError } = await supabase
      .from('user_total_points')
      .select('*')
      .eq('user_id', userId)
      .eq('season', season)
      .single();

    if (totalsError) {
      console.warn('No total points found for user:', totalsError);
    }

    // Get transfer history
    const { data: transfers, error: transfersError } = await supabase
      .from('user_transfer_history')
      .select('*')
      .eq('user_id', userId)
      .eq('season', season)
      .order('gameweek');

    if (transfersError) {
      console.warn('No transfer history found:', transfersError);
    }

    // Get chip history
    const { data: chips, error: chipsError } = await supabase
      .from('user_chip_history')
      .select('*')
      .eq('user_id', userId)
      .eq('season', season)
      .order('gameweek');

    if (chipsError) {
      console.warn('No chip history found:', chipsError);
    }

    res.status(200).json({
      success: true,
      data: {
        scores: scores || [],
        totals: totals || null,
        transfers: transfers || [],
        chips: chips || []
      }
    });

  } catch (error) {
    console.error('Get user history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user history',
      details: error.message
    });
  }
}

// Get player performance for a specific gameweek
async function handleGetPlayerPerformance(req, res, gameweek, season) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: performance, error } = await supabase
      .from('player_gameweek_performance')
      .select('*')
      .eq('gameweek', parseInt(gameweek))
      .eq('season', season)
      .order('total_points', { ascending: false });

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      data: performance,
      gameweek: parseInt(gameweek),
      season
    });

  } catch (error) {
    console.error('Get player performance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get player performance',
      details: error.message
    });
  }
}

// Get season overview and statistics
async function handleGetSeasonOverview(req, res, season) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get season overview
    const { data: overview, error: overviewError } = await supabase
      .from('season_overview')
      .select('*')
      .eq('season', season)
      .single();

    if (overviewError) {
      throw overviewError;
    }

    // Get current leaderboard
    const { data: leaderboard, error: leaderboardError } = await supabase
      .from('user_total_points')
      .select(`
        *,
        user:user_profiles!user_total_points_user_id_fkey(
          id, first_name, last_name, email
        )
      `)
      .eq('season', season)
      .order('total_points', { ascending: false })
      .limit(10);

    if (leaderboardError) {
      console.warn('No leaderboard data found:', leaderboardError);
    }

    res.status(200).json({
      success: true,
      data: {
        overview,
        topUsers: leaderboard || []
      }
    });

  } catch (error) {
    console.error('Get season overview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get season overview',
      details: error.message
    });
  }
}

// Calculate and store gameweek scores (admin function)
async function handleCalculateGameweekScores(req, res, gameweek, season) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log(`🔄 Calculating gameweek ${gameweek} scores for season ${season}`);

    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, email');

    if (usersError) {
      throw usersError;
    }

    const results = [];

    for (const user of users) {
      // Calculate user's score for this gameweek
      const { data: score, error: scoreError } = await supabase
        .rpc('calculate_user_gameweek_score', {
          p_user_id: user.id,
          p_gameweek: parseInt(gameweek),
          p_season: season
        });

      if (scoreError) {
        console.error(`Error calculating score for user ${user.email}:`, scoreError);
        continue;
      }

      // Store the calculated score
      const { error: insertError } = await supabase
        .from('user_gameweek_scores')
        .upsert({
          user_id: user.id,
          gameweek: parseInt(gameweek),
          season,
          total_points: score || 0.0,
          calculated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,gameweek,season'
        });

      if (insertError) {
        console.error(`Error storing score for user ${user.email}:`, insertError);
        continue;
      }

      // Update user totals
      const { error: updateError } = await supabase
        .rpc('update_user_totals', {
          p_user_id: user.id,
          p_season: season
        });

      if (updateError) {
        console.error(`Error updating totals for user ${user.email}:`, updateError);
      }

      results.push({
        user_id: user.id,
        user_email: user.email,
        gameweek: parseInt(gameweek),
        score: score || 0.0
      });
    }

    console.log(`✅ Calculated scores for ${results.length} users`);

    res.status(200).json({
      success: true,
      message: `Calculated gameweek ${gameweek} scores for ${results.length} users`,
      data: results
    });

  } catch (error) {
    console.error('Calculate gameweek scores error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate gameweek scores',
      details: error.message
    });
  }
}

// Get user's team snapshot for a specific gameweek
async function handleGetUserTeamSnapshot(req, res, userId, gameweek, season) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const { data: snapshot, error } = await supabase
      .from('user_team_snapshots')
      .select('*')
      .eq('user_id', userId)
      .eq('gameweek', parseInt(gameweek))
      .eq('season', season)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Team snapshot not found'
        });
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      data: snapshot
    });

  } catch (error) {
    console.error('Get user team snapshot error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user team snapshot',
      details: error.message
    });
  }
}

// Get user's transfer history
async function handleGetTransferHistory(req, res, userId, season) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const { data: transfers, error } = await supabase
      .from('user_transfer_history')
      .select('*')
      .eq('user_id', userId)
      .eq('season', season)
      .order('gameweek, created_at');

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      data: transfers
    });

  } catch (error) {
    console.error('Get transfer history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get transfer history',
      details: error.message
    });
  }
}

// Get user's chip usage history
async function handleGetChipHistory(req, res, userId, season) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    const { data: chips, error } = await supabase
      .from('user_chip_history')
      .select('*')
      .eq('user_id', userId)
      .eq('season', season)
      .order('gameweek');

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      data: chips
    });

  } catch (error) {
    console.error('Get chip history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get chip history',
      details: error.message
    });
  }
}

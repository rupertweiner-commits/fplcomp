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
      case 'simulate-next':
        return await handleSimulateNextGameweek(req, res);
      case 'get-gameweek-results':
        return await handleGetGameweekResults(req, res);
      case 'calculate-user-scores':
        return await handleCalculateUserScores(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Simulation Gameweek API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function handleSimulateNextGameweek(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🎮 Simulating next gameweek...');

    // Get current simulation status
    const { data: status, error: statusError } = await supabase
      .from('simulation_status')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (statusError && statusError.code !== 'PGRST116') {
      throw statusError;
    }

    if (!status || !status.is_simulation_mode) {
      return res.status(400).json({ 
        success: false,
        error: 'Simulation mode not active' 
      });
    }

    const nextGameweek = status.current_gameweek + 1;
    console.log(`📅 Simulating gameweek ${nextGameweek}...`);

    // Get Chelsea players
    const { data: players, error: playersError } = await supabase
      .from('chelsea_players')
      .select('*')
      .eq('is_available', true);

    if (playersError) {
      throw playersError;
    }

    if (!players || players.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'No Chelsea players found' 
      });
    }

    // Generate realistic performance data for this gameweek
    const gameweekResults = players.map(player => {
      const performance = generatePlayerPerformance(player, nextGameweek);
      return {
        gameweek: nextGameweek,
        player_id: player.fpl_id,
        player_name: player.name,
        team_id: 4, // Chelsea
        position: player.position,
        points: performance.points,
        goals_scored: performance.goals_scored,
        assists: performance.assists,
        clean_sheets: performance.clean_sheets,
        yellow_cards: performance.yellow_cards,
        red_cards: performance.red_cards,
        saves: performance.saves,
        bonus_points: performance.bonus_points,
        minutes_played: performance.minutes_played,
        price: player.price
      };
    });

    // Insert gameweek results
    const { data: insertedResults, error: insertError } = await supabase
      .from('gameweek_results')
      .insert(gameweekResults)
      .select();

    if (insertError) {
      throw insertError;
    }

    // Update simulation status
    const { data: updatedStatus, error: updateError } = await supabase
      .from('simulation_status')
      .update({
        current_gameweek: nextGameweek,
        updated_at: new Date().toISOString()
      })
      .eq('id', status.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Calculate user scores for this gameweek
    await calculateUserScoresForGameweek(nextGameweek);

    console.log(`✅ Gameweek ${nextGameweek} simulated successfully`);

    res.status(200).json({
      success: true,
      message: `Gameweek ${nextGameweek} simulated successfully`,
      data: {
        gameweek: nextGameweek,
        results: insertedResults,
        status: updatedStatus
      }
    });

  } catch (error) {
    console.error('❌ Simulate next gameweek error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to simulate next gameweek',
      details: error.message
    });
  }
}

async function handleGetGameweekResults(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { gameweek } = req.query;
    const gameweekNum = gameweek ? parseInt(gameweek) : null;

    let query = supabase
      .from('gameweek_results')
      .select('*')
      .order('points', { ascending: false });

    if (gameweekNum) {
      query = query.eq('gameweek', gameweekNum);
    }

    const { data: results, error } = await query;

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      data: results || []
    });

  } catch (error) {
    console.error('❌ Get gameweek results error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get gameweek results',
      details: error.message
    });
  }
}

async function handleCalculateUserScores(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { gameweek } = req.body;
    const gameweekNum = gameweek || 1;

    await calculateUserScoresForGameweek(gameweekNum);

    res.status(200).json({
      success: true,
      message: `User scores calculated for gameweek ${gameweekNum}`
    });

  } catch (error) {
    console.error('❌ Calculate user scores error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate user scores',
      details: error.message
    });
  }
}

// Helper function to generate realistic player performance
function generatePlayerPerformance(player, gameweek) {
  const basePoints = {
    'GK': 2,
    'DEF': 2,
    'MID': 2,
    'FWD': 2
  };

  let points = basePoints[player.position] || 2;
  let goals_scored = 0;
  let assists = 0;
  let clean_sheets = 0;
  let yellow_cards = 0;
  let red_cards = 0;
  let saves = 0;
  let bonus_points = 0;
  let minutes_played = 90;

  // Add some randomness and position-specific logic
  const random = Math.random();

  // Goals (more likely for forwards and midfielders)
  if (player.position === 'FWD' && random < 0.3) {
    goals_scored = Math.floor(Math.random() * 2) + 1;
    points += goals_scored * (player.position === 'FWD' ? 4 : 5);
  } else if (player.position === 'MID' && random < 0.15) {
    goals_scored = 1;
    points += 5;
  } else if (player.position === 'DEF' && random < 0.05) {
    goals_scored = 1;
    points += 6;
  }

  // Assists (more likely for midfielders)
  if (player.position === 'MID' && random < 0.25) {
    assists = Math.floor(Math.random() * 2) + 1;
    points += assists * 3;
  } else if (player.position === 'FWD' && random < 0.15) {
    assists = 1;
    points += 3;
  }

  // Clean sheets (defenders and goalkeepers)
  if ((player.position === 'DEF' || player.position === 'GK') && random < 0.4) {
    clean_sheets = 1;
    points += player.position === 'GK' ? 4 : 4;
  }

  // Saves (goalkeepers only)
  if (player.position === 'GK') {
    saves = Math.floor(Math.random() * 5) + 1;
    points += Math.floor(saves / 3); // 1 point per 3 saves
  }

  // Cards
  if (random < 0.1) {
    yellow_cards = 1;
    points -= 1;
  } else if (random < 0.02) {
    red_cards = 1;
    points -= 3;
  }

  // Bonus points (top performers)
  if (points >= 8 && random < 0.3) {
    bonus_points = Math.floor(Math.random() * 3) + 1;
    points += bonus_points;
  }

  // Minutes played (some players might not play full 90)
  if (random < 0.1) {
    minutes_played = Math.floor(Math.random() * 60) + 30;
  }

  return {
    points: Math.max(0, points), // Ensure non-negative points
    goals_scored,
    assists,
    clean_sheets,
    yellow_cards,
    red_cards,
    saves,
    bonus_points,
    minutes_played
  };
}

// Helper function to calculate user scores for a specific gameweek
async function calculateUserScoresForGameweek(gameweek) {
  try {
    console.log(`📊 Calculating user scores for gameweek ${gameweek}...`);

    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email')
      .eq('is_active', true);

    if (usersError) {
      console.error('❌ Users query error:', usersError);
      return;
    }

    if (!users || users.length === 0) {
      console.log('📊 No users found for score calculation');
      return;
    }

    // Get gameweek results
    const { data: gameweekResults, error: resultsError } = await supabase
      .from('gameweek_results')
      .select('*')
      .eq('gameweek', gameweek);

    if (resultsError) {
      console.error('❌ Gameweek results error:', resultsError);
      return;
    }

    if (!gameweekResults || gameweekResults.length === 0) {
      console.log(`📊 No results found for gameweek ${gameweek}`);
      return;
    }

    // Calculate scores for each user
    for (const user of users) {
      // Get user's team for this gameweek
      const { data: userTeam, error: teamError } = await supabase
        .from('user_teams')
        .select('*')
        .eq('user_id', user.id);

      if (teamError) {
        console.error(`❌ User team error for ${user.email}:`, teamError);
        continue;
      }

      if (!userTeam || userTeam.length === 0) {
        console.log(`📊 No team found for user ${user.email}`);
        continue;
      }

      // Calculate total points
      let totalPoints = 0;
      let captainPoints = 0;
      let viceCaptainPoints = 0;

      for (const teamPlayer of userTeam) {
        const playerResult = gameweekResults.find(
          result => result.player_id === teamPlayer.player_id
        );

        if (playerResult) {
          const playerPoints = playerResult.points;
          totalPoints += playerPoints;

          if (teamPlayer.is_captain) {
            captainPoints = playerPoints * 2; // Captain gets double points
            totalPoints += playerPoints; // Add the extra points
          } else if (teamPlayer.is_vice_captain) {
            viceCaptainPoints = playerPoints * 1.5; // Vice captain gets 1.5x points
            totalPoints += playerPoints * 0.5; // Add the extra points
          }
        }
      }

      // Store user gameweek score
      const { error: scoreError } = await supabase
        .from('user_gameweek_scores')
        .upsert({
          user_id: user.id,
          gameweek: gameweek,
          total_points: totalPoints,
          captain_points: captainPoints,
          vice_captain_points: viceCaptainPoints,
          bench_points: 0, // TODO: Calculate bench points
          chip_used: null, // TODO: Track chip usage
          chip_points: 0
        }, {
          onConflict: 'user_id,gameweek'
        });

      if (scoreError) {
        console.error(`❌ Score storage error for ${user.email}:`, scoreError);
      }

      // Update total points
      const { data: existingTotal, error: totalError } = await supabase
        .from('user_total_points')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (totalError && totalError.code !== 'PGRST116') {
        console.error(`❌ Total points query error for ${user.email}:`, totalError);
        continue;
      }

      const newTotalPoints = (existingTotal?.total_points || 0) + totalPoints;
      const newGameweeksPlayed = (existingTotal?.gameweeks_played || 0) + 1;
      const newAveragePoints = newTotalPoints / newGameweeksPlayed;

      const { error: updateTotalError } = await supabase
        .from('user_total_points')
        .upsert({
          user_id: user.id,
          total_points: newTotalPoints,
          gameweeks_played: newGameweeksPlayed,
          average_points: newAveragePoints,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (updateTotalError) {
        console.error(`❌ Total points update error for ${user.email}:`, updateTotalError);
      }
    }

    console.log(`✅ User scores calculated for gameweek ${gameweek}`);

  } catch (error) {
    console.error('❌ Calculate user scores error:', error);
  }
}

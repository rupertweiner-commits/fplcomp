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
      case 'status':
        return await handleGetStatus(req, res);
      case 'start':
        return await handleStartSimulation(req, res);
      case 'simulate':
        return await handleSimulateGameweek(req, res);
      case 'simulate-next':
        return await handleSimulateNextGameweek(req, res);
      case 'get-gameweek-results':
        return await handleGetGameweekResults(req, res);
      case 'calculate-user-scores':
        return await handleCalculateUserScores(req, res);
      case 'leaderboard':
        return await handleGetLeaderboard(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Simulation API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function handleGetStatus(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Getting simulation status...');

    // Get simulation status
    const { data: status, error: statusError } = await supabase
      .from('simulation_status')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (statusError && statusError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('❌ Simulation status error:', statusError);
      // Don't throw, provide default status
    }

    // Get draft status
    const { data: draftStatus, error: draftError } = await supabase
      .from('draft_status')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    if (draftError && draftError.code !== 'PGRST116') {
      console.error('❌ Draft status error:', draftError);
      // Don't throw, provide default status
    }

    const simulationStatus = status || {
      is_simulation_mode: false,
      current_gameweek: 1,
      is_draft_complete: draftStatus?.is_draft_complete || false,
      total_users: 0
    };

    console.log('✅ Simulation status retrieved:', simulationStatus);

    res.status(200).json({
      success: true,
      data: simulationStatus
    });

  } catch (error) {
    console.error('❌ Get status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get simulation status',
      details: error.message
    });
  }
}

async function handleStartSimulation(req, res) {
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

  // Check if user is admin - use email-based check to avoid RLS issues
  const isAdmin = user.email === 'rupertweiner@gmail.com';
  
  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  console.log('🔍 Starting simulation for admin:', user.email);
  
  try {
    // Get all users and their current teams
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name')
      .eq('is_active', true);

    if (usersError) {
      throw usersError;
    }

    console.log(`📊 Found ${users.length} users for simulation`);

    // Lock in each user's current team as a snapshot
    for (const user of users) {
      // Get user's current team from user_teams table
      const { data: userTeam, error: teamError } = await supabase
        .from('user_teams')
        .select('*')
        .eq('user_id', user.id);

      if (teamError) {
        console.warn(`⚠️ Could not fetch team for user ${user.email}:`, teamError);
        continue;
      }

      if (userTeam && userTeam.length > 0) {
        // Create team snapshot for gameweek 1
        const teamSnapshot = {
          user_id: user.id,
          gameweek: 1,
          season: '2024-25',
          team_composition: userTeam.map(player => ({
            player_id: player.player_id,
            player_name: player.player_name,
            position: player.position,
            price: player.price,
            is_captain: player.is_captain,
            is_vice_captain: player.is_vice_captain
          })),
          formation: '4-4-2', // Default formation
          transfers_made: 0,
          transfer_cost: 0,
          chip_used: null,
          chip_points: 0
        };

        const { error: snapshotError } = await supabase
          .from('user_team_snapshots')
          .upsert(teamSnapshot, {
            onConflict: 'user_id,gameweek,season'
          });

        if (snapshotError) {
          console.warn(`⚠️ Could not create team snapshot for user ${user.email}:`, snapshotError);
        } else {
          console.log(`✅ Team snapshot created for user ${user.email}`);
        }
      }
    }

    // Start simulation mode
    const { data: simulationStatus, error: statusError } = await supabase
      .from('simulation_status')
      .upsert({
        is_simulation_mode: true,
        current_gameweek: 1,
        is_draft_complete: true,
        total_users: users.length,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (statusError) {
      console.error('❌ Simulation status error:', statusError);
      throw statusError;
    }
    
    console.log('✅ Simulation started successfully with team snapshots');

    res.status(200).json({
      success: true,
      message: 'Simulation started successfully with teams locked in',
      data: {
        ...simulationStatus,
        teams_locked: users.length
      }
    });

  } catch (error) {
    console.error('❌ Start simulation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start simulation',
      details: error.message
    });
  }
}

async function handleSimulateGameweek(req, res) {
  try {
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

  // Check if user is admin - use email-based check to avoid RLS issues
  const isAdmin = user.email === 'rupertweiner@gmail.com';
  
  if (!isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const { gameweek } = req.body;

  if (!gameweek) {
    return res.status(400).json({ error: 'Gameweek required' });
  }

  // Simulate gameweek (mock implementation)
  console.log('🔍 Fetching users for simulation...');
  console.log('🔍 Using Supabase client:', !!supabase);
  console.log('🔍 Querying table: user_profiles');
  
  let { data: users, error: usersError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('is_active', true);

  if (usersError) {
    console.error('❌ Users query error:', usersError);
    // If user_profiles table doesn't exist or has RLS issues, use empty array
    if (usersError.message?.includes('relation "user_profiles" does not exist') || 
        usersError.message?.includes('PGRST200') ||
        usersError.message?.includes('permission denied')) {
      console.log('ℹ️ User_profiles table access denied, using empty array for simulation');
      users = [];
    } else {
      throw usersError;
    }
  }
  
  console.log('✅ Users fetched for simulation:', users?.length || 0, 'users');

  // Generate mock scores for each user
  const gameweekResults = users.map(user => ({
    user_id: user.id,
    gameweek: gameweek,
    total_points: Math.floor(Math.random() * 50) + 20, // Random points between 20-70
    captain_points: Math.floor(Math.random() * 20) + 5,
    bench_points: Math.floor(Math.random() * 10),
    created_at: new Date().toISOString()
  }));

  // Insert gameweek results
  const { data: results, error: resultsError } = await supabase
    .from('gameweek_results')
    .insert(gameweekResults)
    .select();

  if (resultsError) {
    throw resultsError;
  }

  // Update simulation status
  const { data: status, error: statusError } = await supabase
    .from('simulation_status')
    .upsert({
      is_simulation_mode: true,
      current_gameweek: gameweek + 1,
      is_draft_complete: true,
      total_users: users.length,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (statusError) {
    throw statusError;
  }

  res.status(200).json({
    success: true,
    message: `Gameweek ${gameweek} simulated successfully`,
    data: {
      results,
      status
    }
  });
  } catch (error) {
    console.error('❌ Simulate gameweek error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function handleGetLeaderboard(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Getting leaderboard...');

    // Get user total points from the enhanced table
    const { data: userTotals, error: totalsError } = await supabase
      .from('user_total_points')
      .select(`
        *,
        user:user_profiles!user_total_points_user_id_fkey(id, first_name, last_name, email)
      `)
      .eq('season', '2024-25')
      .order('total_points', { ascending: false });

    if (totalsError) {
      console.error('❌ User totals error:', totalsError);
      // Fallback to empty leaderboard
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    // If no data, return empty leaderboard
    if (!userTotals || userTotals.length === 0) {
      console.log('📊 No leaderboard data found, returning empty array');
      return res.status(200).json({
        success: true,
        data: []
      });
    }

    // Sort by total points and add ranks
    const leaderboard = userTotals.map((user, index) => ({
      user_id: user.user_id,
      user: user.user,
      totalPoints: user.total_points || 0,
      gameweeksPlayed: user.gameweeks_played || 0,
      averagePoints: user.average_points || 0,
      currentRank: user.current_rank || (index + 1),
      bestRank: user.best_rank || (index + 1),
      worstRank: user.worst_rank || (index + 1),
      rank: index + 1,
      highestGameweekScore: user.highest_gameweek_score || 0,
      lowestGameweekScore: user.lowest_gameweek_score || 0,
      consistency: user.score_variance ? (100 - (user.score_variance / (user.average_points || 1) * 100)) : 0
    }));

    console.log('✅ Leaderboard retrieved:', leaderboard.length, 'users');

    res.status(200).json({
      success: true,
      data: leaderboard
    });

  } catch (error) {
    console.error('❌ Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leaderboard',
      details: error.message
    });
  }
}

// Gameweek simulation functions
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
      .from('user_profiles')
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
      // Get user's team snapshot for this gameweek (simulation mode)
      const { data: teamSnapshot, error: snapshotError } = await supabase
        .from('user_team_snapshots')
        .select('team_composition')
        .eq('user_id', user.id)
        .eq('gameweek', gameweek)
        .eq('season', '2024-25')
        .single();

      let userTeam = [];
      
      if (snapshotError || !teamSnapshot) {
        // Fallback to current user_teams table if no snapshot exists
        const { data: currentTeam, error: teamError } = await supabase
          .from('user_teams')
          .select('*')
          .eq('user_id', user.id);

        if (teamError) {
          console.error(`❌ User team error for ${user.email}:`, teamError);
          continue;
        }

        if (!currentTeam || currentTeam.length === 0) {
          console.log(`📊 No team found for user ${user.email}`);
          continue;
        }

        userTeam = currentTeam;
      } else {
        // Convert team composition from snapshot to team format
        userTeam = teamSnapshot.team_composition.map(player => ({
          player_id: player.player_id,
          player_name: player.player_name,
          position: player.position,
          price: player.price,
          is_captain: player.is_captain,
          is_vice_captain: player.is_vice_captain
        }));
      }

      // Calculate total points
      let totalPoints = 0;
      let captainPoints = 0;
      let viceCaptainPoints = 0;
      let startingXiPoints = 0;

      for (const teamPlayer of userTeam) {
        const playerResult = gameweekResults.find(
          result => result.player_id === teamPlayer.player_id
        );

        if (playerResult) {
          const playerPoints = playerResult.points;
          startingXiPoints += playerPoints;

          if (teamPlayer.is_captain) {
            captainPoints = playerPoints; // Captain gets double points
            totalPoints += playerPoints * 2;
          } else if (teamPlayer.is_vice_captain) {
            viceCaptainPoints = playerPoints * 0.5; // Vice captain gets 1.5x points
            totalPoints += playerPoints * 1.5;
          } else {
            totalPoints += playerPoints;
          }
        }
      }

      // Store user gameweek score
      const { error: scoreError } = await supabase
        .from('user_gameweek_scores')
        .upsert({
          user_id: user.id,
          gameweek: gameweek,
          season: '2024-25',
          total_points: totalPoints,
          starting_xi_points: startingXiPoints,
          captain_points: captainPoints,
          vice_captain_points: viceCaptainPoints,
          bench_points: 0, // TODO: Calculate bench points
          chip_used: null, // TODO: Track chip usage
          chip_points: 0,
          transfer_cost: 0,
          calculated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,gameweek,season'
        });

      if (scoreError) {
        console.error(`❌ Score storage error for ${user.email}:`, scoreError);
      }

      // Update total points using enhanced schema
      const { data: existingTotal, error: totalError } = await supabase
        .from('user_total_points')
        .select('total_points, gameweeks_played')
        .eq('user_id', user.id)
        .eq('season', '2024-25')
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
          season: '2024-25',
          total_points: newTotalPoints,
          gameweeks_played: newGameweeksPlayed,
          average_points: newAveragePoints,
          current_rank: 0, // Will be calculated separately
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'user_id,season'
        });

      if (updateTotalError) {
        console.error(`❌ Total points update error for ${user.email}:`, updateTotalError);
      } else {
        console.log(`✅ Updated total points for ${user.email}: ${newTotalPoints} (GW${gameweek}: +${totalPoints})`);
      }
    }

    // Update gameweek rankings
    await updateGameweekRankings(gameweek);

    console.log(`✅ User scores calculated for gameweek ${gameweek}`);

  } catch (error) {
    console.error('❌ Calculate user scores error:', error);
  }
}

// Helper function to update gameweek rankings
async function updateGameweekRankings(gameweek) {
  try {
    console.log(`📊 Updating gameweek ${gameweek} rankings...`);

    // Get all user scores for this gameweek, ordered by total points
    const { data: gameweekScores, error: scoresError } = await supabase
      .from('user_gameweek_scores')
      .select('user_id, total_points')
      .eq('gameweek', gameweek)
      .eq('season', '2024-25')
      .order('total_points', { ascending: false });

    if (scoresError) {
      console.error('❌ Gameweek scores error:', scoresError);
      return;
    }

    if (!gameweekScores || gameweekScores.length === 0) {
      console.log('⚠️ No gameweek scores found for ranking');
      return;
    }

    // Get previous gameweek rankings for rank change calculation
    const { data: previousRankings, error: prevError } = await supabase
      .from('gameweek_rankings')
      .select('user_id, rank')
      .eq('gameweek', gameweek - 1)
      .eq('season', '2024-25');

    const prevRankings = {};
    if (previousRankings) {
      previousRankings.forEach(ranking => {
        prevRankings[ranking.user_id] = ranking.rank;
      });
    }

    // Create rankings for this gameweek
    const rankings = gameweekScores.map((score, index) => {
      const currentRank = index + 1;
      const previousRank = prevRankings[score.user_id] || currentRank;
      const rankChange = previousRank - currentRank; // Positive means moved up

      return {
        gameweek: gameweek,
        season: '2024-25',
        user_id: score.user_id,
        rank: currentRank,
        points: score.total_points,
        rank_change: rankChange,
        points_change: 0, // Could calculate from previous gameweek if needed
        calculated_at: new Date().toISOString()
      };
    });

    // Insert rankings
    const { error: insertError } = await supabase
      .from('gameweek_rankings')
      .upsert(rankings, {
        onConflict: 'gameweek,season,user_id'
      });

    if (insertError) {
      console.error('❌ Rankings insert error:', insertError);
    } else {
      console.log(`✅ Gameweek ${gameweek} rankings updated for ${rankings.length} users`);
    }

  } catch (error) {
    console.error('❌ Update gameweek rankings error:', error);
  }
}

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

  // Get simulation status
  const { data: status, error: statusError } = await supabase
    .from('simulation_status')
    .select('*')
    .order('id', { ascending: false })
    .limit(1)
    .single();

  if (statusError && statusError.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw statusError;
  }

  // Get draft status
  const { data: draftStatus, error: draftError } = await supabase
    .from('draft_status')
    .select('*')
    .order('id', { ascending: false })
    .limit(1)
    .single();

  if (draftError && draftError.code !== 'PGRST116') {
    throw draftError;
  }

  const simulationStatus = status || {
    is_simulation_mode: false,
    current_gameweek: 1,
    is_draft_complete: draftStatus?.is_complete || false,
    total_users: 0
  };

  res.status(200).json({
    success: true,
    data: simulationStatus
  });
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
  
  // Start simulation mode
  const { data: simulationStatus, error: statusError } = await supabase
    .from('simulation_status')
    .upsert({
      is_simulation_mode: true,
      current_gameweek: 1,
      is_draft_complete: true,
      total_users: 4, // Assuming 4 users
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (statusError) {
    console.error('❌ Simulation status error:', statusError);
    throw statusError;
  }
  
  console.log('✅ Simulation status updated:', simulationStatus);

  res.status(200).json({
    success: true,
    message: 'Simulation started successfully',
    data: simulationStatus
  });
}

async function handleSimulateGameweek(req, res) {
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
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .eq('is_active', true);

  if (usersError) {
    throw usersError;
  }

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
}

async function handleGetLeaderboard(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get all gameweek results
  const { data: results, error: resultsError } = await supabase
    .from('gameweek_results')
    .select(`
      *,
      user:users!gameweek_results_user_id_fkey(id, first_name, last_name, email)
    `);

  if (resultsError) {
    throw resultsError;
  }

  // Calculate total points for each user
  const userTotals = {};
  
  results.forEach(score => {
    if (!userTotals[score.user_id]) {
      userTotals[score.user_id] = {
        user_id: score.user_id,
        user: score.user,
        totalPoints: 0,
        gameweeksPlayed: 0,
        averagePoints: 0
      };
    }
    
    userTotals[score.user_id].totalPoints += score.total_points;
    userTotals[score.user_id].gameweeksPlayed += 1;
  });

  // Calculate averages
  Object.values(userTotals).forEach(user => {
    user.averagePoints = user.gameweeksPlayed > 0 ? user.totalPoints / user.gameweeksPlayed : 0;
  });

  // Sort by total points
  const leaderboard = Object.values(userTotals).sort((a, b) => b.totalPoints - a.totalPoints);

  res.status(200).json({
    success: true,
    data: { leaderboard }
  });
}

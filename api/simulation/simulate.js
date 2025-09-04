import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { gameweek } = req.body;

    if (!gameweek || gameweek < 1 || gameweek > 38) {
      return res.status(400).json({ error: 'Invalid gameweek. Must be between 1 and 38.' });
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

    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Check if simulation mode is enabled
    const { data: simulationStatus, error: statusError } = await supabase
      .from('simulation_status')
      .select('*')
      .single();

    if (statusError) {
      throw statusError;
    }

    if (!simulationStatus?.is_simulation_mode) {
      return res.status(400).json({ 
        error: 'Simulation mode is not enabled. Start simulation first.' 
      });
    }

    // Get all user teams
    const { data: userTeams, error: teamsError } = await supabase
      .from('user_teams')
      .select(`
        *,
        users!inner(id, email, first_name, last_name)
      `)
      .eq('gameweek', 1);

    if (teamsError) {
      throw teamsError;
    }

    if (userTeams.length < 4) {
      return res.status(400).json({ 
        error: 'Not all users have teams assigned' 
      });
    }

    // Simulate scores for each user
    const gameweekResults = [];
    
    for (const userTeam of userTeams) {
      const user = userTeam.users;
      let totalScore = 0;
      const playerScores = [];

      // Generate random scores for each player in the team
      for (const player of userTeam.players) {
        const baseScore = generatePlayerScore(player, gameweek);
        let finalScore = baseScore;

        // Apply captain bonus (2x points) - randomly select captain
        const isCaptain = Math.random() < 0.2; // 20% chance to be captain
        if (isCaptain) {
          finalScore *= 2;
        }

        totalScore += finalScore;
        playerScores.push({
          playerId: player.id,
          playerName: player.name,
          position: player.position,
          points: baseScore,
          finalPoints: finalScore,
          isCaptain
        });
      }

      gameweekResults.push({
        userId: user.id,
        username: `${user.first_name} ${user.last_name}`.trim(),
        totalScore,
        playerScores
      });
    }

    // Sort by total score (descending)
    gameweekResults.sort((a, b) => b.totalScore - a.totalScore);

    // Save gameweek results to database
    const { error: saveError } = await supabase
      .from('gameweek_results')
      .upsert({
        gameweek,
        results: gameweekResults,
        created_at: new Date().toISOString()
      });

    if (saveError) {
      throw saveError;
    }

    res.status(200).json({
      success: true,
      message: `Gameweek ${gameweek} simulated successfully`,
      gameweek,
      results: gameweekResults
    });

  } catch (error) {
    console.error('Failed to simulate gameweek:', error);
    res.status(500).json({ 
      error: 'Failed to simulate gameweek',
      details: error.message 
    });
  }
}

// Generate realistic player score
function generatePlayerScore(player, gameweek) {
  const basePoints = 2; // Appearance points
  let points = basePoints;
  
  // Position-based scoring
  switch (player.position) {
    case 'GK':
      points += Math.random() < 0.3 ? 4 : 0; // Clean sheet
      points += Math.random() < 0.1 ? 5 : 0; // Save points
      break;
    case 'DEF':
      points += Math.random() < 0.3 ? 4 : 0; // Clean sheet
      points += Math.random() < 0.1 ? 6 : 0; // Goal
      points += Math.random() < 0.15 ? 3 : 0; // Assist
      break;
    case 'MID':
      points += Math.random() < 0.15 ? 5 : 0; // Goal
      points += Math.random() < 0.25 ? 3 : 0; // Assist
      points += Math.random() < 0.2 ? 1 : 0; // Passing points
      break;
    case 'FWD':
      points += Math.random() < 0.25 ? 4 : 0; // Goal
      points += Math.random() < 0.2 ? 3 : 0; // Assist
      break;
  }
  
  // Bonus points
  if (Math.random() < 0.25) {
    points += Math.floor(Math.random() * 3) + 1;
  }
  
  // Random variance
  const variance = (Math.random() - 0.5) * 4; // -2 to +2
  points += variance;
  
  // Ensure minimum 0 points
  return Math.max(0, Math.round(points));
}

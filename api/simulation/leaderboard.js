import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all gameweek results
    const { data: gameweekResults, error: resultsError } = await supabase
      .from('gameweek_results')
      .select('*')
      .order('gameweek', { ascending: true });

    if (resultsError) {
      throw resultsError;
    }

    // Calculate overall leaderboard
    const userTotals = {};
    
    // Initialize user totals
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('is_active', true);

    if (usersError) {
      throw usersError;
    }

    for (const user of users) {
      userTotals[user.id] = {
        userId: user.id,
        username: `${user.first_name} ${user.last_name}`.trim(),
        totalPoints: 0,
        gameweeksPlayed: 0,
        averagePoints: 0,
        bestGameweek: 0,
        worstGameweek: 999
      };
    }

    // Sum up all gameweek scores
    for (const gameweek of gameweekResults) {
      for (const result of gameweek.results) {
        const userId = result.userId;
        if (userTotals[userId]) {
          userTotals[userId].totalPoints += result.totalScore;
          userTotals[userId].gameweeksPlayed++;
          userTotals[userId].bestGameweek = Math.max(userTotals[userId].bestGameweek, result.totalScore);
          userTotals[userId].worstGameweek = Math.min(userTotals[userId].worstGameweek, result.totalScore);
        }
      }
    }

    // Calculate averages
    for (const userId in userTotals) {
      const user = userTotals[userId];
      if (user.gameweeksPlayed > 0) {
        user.averagePoints = Math.round((user.totalPoints / user.gameweeksPlayed) * 10) / 10;
      }
    }

    // Sort by total points
    const leaderboard = Object.values(userTotals).sort((a, b) => b.totalPoints - a.totalPoints);

    // Add rank
    leaderboard.forEach((user, index) => {
      user.rank = index + 1;
    });

    res.status(200).json({
      success: true,
      leaderboard,
      totalGameweeks: gameweekResults.length,
      lastGameweek: gameweekResults.length > 0 ? gameweekResults[gameweekResults.length - 1].gameweek : 0
    });

  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    res.status(500).json({ 
      error: 'Failed to fetch leaderboard',
      details: error.message 
    });
  }
}

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;
  const { days = 30 } = req.query;

  try {
    // Get user activity from various sources
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get team changes
    const { data: teamChanges, error: teamError } = await supabase
      .from('user_teams')
      .select('*')
      .eq('user_id', userId)
      .gte('updated_at', startDate.toISOString())
      .order('updated_at', { ascending: false });

    if (teamError) {
      throw teamError;
    }

    // Get chip usage
    const { data: chipUsage, error: chipError } = await supabase
      .from('chip_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('used_at', startDate.toISOString())
      .order('used_at', { ascending: false });

    if (chipError) {
      throw chipError;
    }

    // Get transfer history
    const { data: transfers, error: transferError } = await supabase
      .from('transfer_history')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (transferError) {
      throw transferError;
    }

    // Get gameweek results
    const { data: gameweekResults, error: resultsError } = await supabase
      .from('gameweek_results')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (resultsError) {
      throw resultsError;
    }

    // Process activity data
    const activities = [];

    // Add team changes
    teamChanges.forEach(change => {
      activities.push({
        id: `team-${change.id}`,
        type: 'team_change',
        description: 'Updated team lineup',
        timestamp: change.updated_at,
        gameweek: change.gameweek,
        details: {
          activePlayers: change.active_players?.length || 0,
          captain: change.captain,
          benchedPlayer: change.benched_player
        }
      });
    });

    // Add chip usage
    chipUsage.forEach(chip => {
      activities.push({
        id: `chip-${chip.id}`,
        type: 'chip_used',
        description: `Used ${chip.chip_name} chip`,
        timestamp: chip.used_at,
        gameweek: chip.gameweek,
        details: {
          chipName: chip.chip_name,
          targetUserId: chip.target_user_id
        }
      });
    });

    // Add transfers
    transfers.forEach(transfer => {
      activities.push({
        id: `transfer-${transfer.id}`,
        type: 'transfer',
        description: 'Made player transfer',
        timestamp: transfer.created_at,
        gameweek: transfer.gameweek,
        details: {
          playerOutId: transfer.player_out_id,
          playerInId: transfer.player_in_id,
          cost: transfer.transfer_cost
        }
      });
    });

    // Add gameweek participation
    gameweekResults.forEach(result => {
      const userResult = result.results.find(r => r.userId === userId);
      if (userResult) {
        activities.push({
          id: `gameweek-${result.gameweek}`,
          type: 'gameweek_score',
          description: `Scored ${userResult.totalScore} points in Gameweek ${result.gameweek}`,
          timestamp: result.created_at,
          gameweek: result.gameweek,
          details: {
            score: userResult.totalScore,
            rank: result.results.findIndex(r => r.userId === userId) + 1
          }
        });
      }
    });

    // Sort by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Calculate stats
    const stats = {
      totalActivities: activities.length,
      teamChanges: teamChanges.length,
      chipsUsed: chipUsage.length,
      transfers: transfers.length,
      gameweeksPlayed: gameweekResults.length,
      averageScore: 0,
      bestScore: 0,
      worstScore: 999
    };

    // Calculate score stats from gameweek results
    const userScores = [];
    gameweekResults.forEach(result => {
      const userResult = result.results.find(r => r.userId === userId);
      if (userResult) {
        userScores.push(userResult.totalScore);
      }
    });

    if (userScores.length > 0) {
      stats.averageScore = Math.round(userScores.reduce((sum, score) => sum + score, 0) / userScores.length);
      stats.bestScore = Math.max(...userScores);
      stats.worstScore = Math.min(...userScores);
    }

    res.status(200).json({
      success: true,
      data: {
        activities: activities.slice(0, 50), // Limit to 50 most recent
        stats,
        period: parseInt(days)
      }
    });

  } catch (error) {
    console.error('Failed to fetch user activity:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user activity',
      details: error.message 
    });
  }
}

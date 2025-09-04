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
    // Get recent activity from all users
    const { limit = 20 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Last 7 days

    // Get recent team changes
    const { data: teamChanges, error: teamError } = await supabase
      .from('user_teams')
      .select(`
        *,
        users!inner(id, email, first_name, last_name)
      `)
      .gte('updated_at', startDate.toISOString())
      .order('updated_at', { ascending: false })
      .limit(parseInt(limit));

    if (teamError) {
      throw teamError;
    }

    // Get recent chip usage
    const { data: chipUsage, error: chipError } = await supabase
      .from('chip_usage')
      .select(`
        *,
        users!inner(id, email, first_name, last_name)
      `)
      .gte('used_at', startDate.toISOString())
      .order('used_at', { ascending: false })
      .limit(parseInt(limit));

    if (chipError) {
      throw chipError;
    }

    // Get recent transfers
    const { data: transfers, error: transferError } = await supabase
      .from('transfer_history')
      .select(`
        *,
        users!inner(id, email, first_name, last_name)
      `)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (transferError) {
      throw transferError;
    }

    // Get recent gameweek results
    const { data: gameweekResults, error: resultsError } = await supabase
      .from('gameweek_results')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (resultsError) {
      throw resultsError;
    }

    // Process and combine all activities
    const activities = [];

    // Add team changes
    teamChanges.forEach(change => {
      activities.push({
        id: `team-${change.id}`,
        type: 'team_change',
        description: 'Updated team lineup',
        timestamp: change.updated_at,
        gameweek: change.gameweek,
        user: {
          id: change.users.id,
          name: `${change.users.first_name} ${change.users.last_name}`.trim(),
          email: change.users.email
        },
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
        user: {
          id: chip.users.id,
          name: `${chip.users.first_name} ${chip.users.last_name}`.trim(),
          email: chip.users.email
        },
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
        user: {
          id: transfer.users.id,
          name: `${transfer.users.first_name} ${transfer.users.last_name}`.trim(),
          email: transfer.users.email
        },
        details: {
          playerOutId: transfer.player_out_id,
          playerInId: transfer.player_in_id,
          cost: transfer.transfer_cost
        }
      });
    });

    // Add gameweek completions
    gameweekResults.forEach(result => {
      activities.push({
        id: `gameweek-${result.gameweek}`,
        type: 'gameweek_completed',
        description: `Gameweek ${result.gameweek} completed`,
        timestamp: result.created_at,
        gameweek: result.gameweek,
        user: null, // System event
        details: {
          totalResults: result.results.length,
          topScore: Math.max(...result.results.map(r => r.totalScore))
        }
      });
    });

    // Sort by timestamp and limit
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const limitedActivities = activities.slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        activities: limitedActivities,
        total: activities.length
      }
    });

  } catch (error) {
    console.error('Failed to fetch recent activity:', error);
    res.status(500).json({ 
      error: 'Failed to fetch recent activity',
      details: error.message 
    });
  }
}

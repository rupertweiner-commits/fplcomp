import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
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
      case 'get-competition-status':
        return await handleGetCompetitionStatus(req, res);
      case 'update-baseline':
        return await handleUpdateBaseline(req, res);
      case 'get-leaderboard':
        return await handleGetLeaderboard(req, res);
      case 'calculate-points':
        return await handleCalculatePoints(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Competition Points API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

// Get competition status and configuration
async function handleGetCompetitionStatus(req, res) {
  try {
    const { data: draftStatus, error } = await supabase
      .from('draft_status')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) throw error;

    res.status(200).json({
      success: true,
      data: {
        status: draftStatus,
        competitionActive: draftStatus?.is_draft_active || false,
        startDate: draftStatus?.competition_start_date || new Date().toISOString().split('T')[0],
        pointsStartDate: draftStatus?.points_start_date || new Date().toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error('Get competition status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get competition status',
      details: error.message
    });
  }
}

// Set baseline points for competition (preserves all existing FPL data)
async function handleUpdateBaseline(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Set baseline points to current total_points (for leaderboard calculation only)
    // This does NOT modify the actual FPL total_points - just sets a reference point
    const { data: updatedPlayers, error } = await supabase
      .from('chelsea_players')
      .update({ baseline_points: supabase.raw('COALESCE(total_points, 0)') })
      .select('id, name, total_points, baseline_points');

    if (error) throw error;

    // Update competition start date to today
    const today = new Date().toISOString().split('T')[0];
    await supabase
      .from('draft_status')
      .update({ 
        points_start_date: today,
        competition_start_date: today,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1);

    res.status(200).json({
      success: true,
      data: {
        message: 'Baseline points updated successfully',
        playersUpdated: updatedPlayers?.length || 0,
        newStartDate: today
      }
    });

  } catch (error) {
    console.error('Update baseline error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update baseline points',
      details: error.message
    });
  }
}

// Get competition leaderboard (points since competition start)
async function handleGetLeaderboard(req, res) {
  try {
    // Get users with their allocated players and competition points
    const { data: userTeams, error } = await supabase
      .from('chelsea_players')
      .select(`
        assigned_to_user_id,
        name,
        total_points,
        baseline_points,
        is_captain,
        is_vice_captain,
        user:user_profiles!assigned_to_user_id(*)
      `)
      .not('assigned_to_user_id', 'is', null);

    if (error) throw error;

    // Calculate competition points for each user
    const leaderboard = {};
    
    userTeams.forEach(player => {
      const userId = player.assigned_to_user_id;
      const competitionPoints = Math.max(0, (player.total_points || 0) - (player.baseline_points || 0));
      
      if (!leaderboard[userId]) {
        leaderboard[userId] = {
          user: player.user,
          players: [],
          totalCompetitionPoints: 0,
          captainPoints: 0,
          viceCaptainPoints: 0
        };
      }
      
      leaderboard[userId].players.push({
        name: player.name,
        totalPoints: player.total_points || 0,
        baselinePoints: player.baseline_points || 0,
        competitionPoints: competitionPoints,
        isCaptain: player.is_captain,
        isViceCaptain: player.is_vice_captain
      });
      
      // Add to total (captain gets double points)
      if (player.is_captain) {
        leaderboard[userId].totalCompetitionPoints += competitionPoints * 2;
        leaderboard[userId].captainPoints = competitionPoints * 2;
      } else if (player.is_vice_captain) {
        leaderboard[userId].totalCompetitionPoints += competitionPoints;
        leaderboard[userId].viceCaptainPoints = competitionPoints;
      } else {
        leaderboard[userId].totalCompetitionPoints += competitionPoints;
      }
    });

    // Convert to array and sort by total competition points
    const sortedLeaderboard = Object.values(leaderboard)
      .sort((a, b) => b.totalCompetitionPoints - a.totalCompetitionPoints);

    res.status(200).json({
      success: true,
      data: {
        leaderboard: sortedLeaderboard,
        totalUsers: sortedLeaderboard.length
      }
    });

  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get leaderboard',
      details: error.message
    });
  }
}

// Calculate and update competition points for all users
async function handleCalculatePoints(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // This would be called after FPL sync to recalculate competition points
    // The competition_points column is auto-calculated, so we just need to trigger a refresh
    
    const { data: players, error } = await supabase
      .from('chelsea_players')
      .select('id, name, total_points, baseline_points, assigned_to_user_id')
      .not('assigned_to_user_id', 'is', null);

    if (error) throw error;

    // Calculate total competition points per user
    const userPoints = {};
    players.forEach(player => {
      const competitionPoints = Math.max(0, (player.total_points || 0) - (player.baseline_points || 0));
      const userId = player.assigned_to_user_id;
      
      if (!userPoints[userId]) {
        userPoints[userId] = 0;
      }
      userPoints[userId] += competitionPoints;
    });

    res.status(200).json({
      success: true,
      data: {
        message: 'Competition points calculated',
        userPoints: userPoints,
        totalPlayers: players.length
      }
    });

  } catch (error) {
    console.error('Calculate points error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate points',
      details: error.message
    });
  }
}

// Enhanced Leaderboard API - Serves comprehensive leaderboard data with stats and awards
import { supabase } from '../client/src/config/supabase.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { action = 'get_leaderboard' } = req.query;

    switch (action) {
      case 'get_leaderboard':
        return await getEnhancedLeaderboard(req, res);
      case 'get_awards':
        return await getAwards(req, res);
      case 'calculate_awards':
        return await calculateAwards(req, res);
      case 'get_user_stats':
        return await getUserStats(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Enhanced leaderboard API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// Get enhanced leaderboard with detailed stats
async function getEnhancedLeaderboard(req, res) {
  try {
    console.log('📊 Fetching enhanced leaderboard...');

    // Get leaderboard data from the enhanced view
    const { data: leaderboardData, error: leaderboardError } = await supabase
      .from('enhanced_leaderboard')
      .select('*')
      .order('competition_points_with_multiplier', { ascending: false });

    if (leaderboardError) {
      console.error('❌ Error fetching leaderboard:', leaderboardError);
      return res.status(500).json({ error: 'Failed to fetch leaderboard data' });
    }

    // Add rankings
    const rankedLeaderboard = leaderboardData.map((user, index) => ({
      ...user,
      rank: index + 1,
      is_podium: index < 3
    }));

    // Get current gameweek from draft_status
    const { data: draftStatus } = await supabase
      .from('draft_status')
      .select('current_gameweek, competition_start_date')
      .eq('id', 1)
      .single();

    console.log('✅ Enhanced leaderboard fetched successfully');
    
    return res.status(200).json({
      success: true,
      leaderboard: rankedLeaderboard,
      meta: {
        total_users: rankedLeaderboard.length,
        current_gameweek: draftStatus?.current_gameweek || 1,
        competition_start_date: draftStatus?.competition_start_date,
        last_updated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Enhanced leaderboard error:', error);
    return res.status(500).json({ error: 'Failed to fetch enhanced leaderboard' });
  }
}

// Get awards for all users or specific user
async function getAwards(req, res) {
  try {
    const { user_id, season = '2024-25' } = req.query;
    
    console.log('🏆 Fetching awards...', { user_id, season });

    let query = supabase
      .from('user_awards')
      .select(`
        *,
        user_profiles!inner(
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('season', season)
      .order('awarded_at', { ascending: false });

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data: awards, error: awardsError } = await query;

    if (awardsError) {
      console.error('❌ Error fetching awards:', awardsError);
      return res.status(500).json({ error: 'Failed to fetch awards' });
    }

    console.log('✅ Awards fetched successfully');
    
    return res.status(200).json({
      success: true,
      awards: awards || [],
      meta: {
        total_awards: awards?.length || 0,
        season,
        user_id: user_id || 'all'
      }
    });

  } catch (error) {
    console.error('❌ Awards fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch awards' });
  }
}

// Calculate and award achievements
async function calculateAwards(req, res) {
  try {
    const { season = '2024-25' } = req.body;
    
    console.log('🏆 Calculating awards for season:', season);

    // Call the stored function to calculate awards
    const { data: awards, error: awardsError } = await supabase
      .rpc('calculate_and_award_achievements', { p_season: season });

    if (awardsError) {
      console.error('❌ Error calculating awards:', awardsError);
      return res.status(500).json({ error: 'Failed to calculate awards' });
    }

    console.log('✅ Awards calculated successfully:', awards);
    
    return res.status(200).json({
      success: true,
      awards: awards || [],
      message: `Awards calculated for season ${season}`,
      meta: {
        awards_count: awards?.length || 0,
        season
      }
    });

  } catch (error) {
    console.error('❌ Calculate awards error:', error);
    return res.status(500).json({ error: 'Failed to calculate awards' });
  }
}

// Get detailed stats for a specific user
async function getUserStats(req, res) {
  try {
    const { user_id, season = '2024-25' } = req.query;
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id is required' });
    }

    console.log('📈 Fetching user stats...', { user_id, season });

    // Get user season stats
    const { data: seasonStats, error: seasonError } = await supabase
      .from('user_season_stats')
      .select('*')
      .eq('user_id', user_id)
      .eq('season', season)
      .single();

    // Get user's weekly performance
    const { data: weeklyPerformance, error: weeklyError } = await supabase
      .from('user_team_performance')
      .select('*')
      .eq('user_id', user_id)
      .order('gameweek', { ascending: true });

    // Get user's awards
    const { data: userAwards, error: awardsError } = await supabase
      .from('user_awards')
      .select('*')
      .eq('user_id', user_id)
      .eq('season', season);

    // Get user's current team from enhanced_leaderboard
    const { data: currentTeam, error: teamError } = await supabase
      .from('enhanced_leaderboard')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (seasonError && seasonError.code !== 'PGRST116') {
      console.error('❌ Error fetching season stats:', seasonError);
    }

    console.log('✅ User stats fetched successfully');
    
    return res.status(200).json({
      success: true,
      user_stats: {
        season_stats: seasonStats || null,
        weekly_performance: weeklyPerformance || [],
        awards: userAwards || [],
        current_team: currentTeam || null
      },
      meta: {
        user_id,
        season,
        has_season_stats: !!seasonStats,
        weekly_games: weeklyPerformance?.length || 0,
        total_awards: userAwards?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ User stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch user stats' });
  }
}

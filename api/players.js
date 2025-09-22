// Consolidated Players API
// Combines: fpl-sync.js + gameweek-scores.js + player-ownership-scores.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Check Supabase connection
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing Supabase environment variables');
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'Missing Supabase configuration' 
      });
    }

    const { action } = req.query;

    switch (action) {
      // FPL Data Sync
      case 'get-chelsea-players':
        return await handleGetChelseaPlayers(req, res);
      case 'sync-chelsea-players':
        return await handleSyncChelseaPlayers(req, res);
      case 'login-sync':
        return await handleLoginSync(req, res);
      case 'sync-status':
        return await handleSyncStatus(req, res);
      case 'bootstrap':
        return await handleBootstrap(req, res);
      case 'current-gameweek':
        return await handleCurrentGameweek(req, res);
      case 'live-scores':
        return await handleLiveScores(req, res);
      case 'dashboard':
        return await handleDashboard(req, res);

      // Gameweek Scores
      case 'get-user-scores':
        return await handleGetUserScores(req, res);
      case 'get-gameweek-leaderboard':
        return await handleGetGameweekLeaderboard(req, res);
      case 'get-user-history':
        return await handleGetUserHistory(req, res);

      // Player Ownership & Scores
      case 'get-player-scores':
        return await handleGetPlayerScores(req, res);
      case 'get-user-team-scores':
        return await handleGetUserTeamScores(req, res);
      case 'get-gameweek-breakdown':
        return await handleGetGameweekBreakdown(req, res);

      // Test endpoint for debugging
      case 'test-connection':
        return await handleTestConnection(req, res);

      // Sync individual gameweek points
      case 'sync-gameweek-points':
        return await handleSyncGameweekPoints(req, res);

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Players API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// ========== FPL DATA SYNC HANDLERS ==========

async function handleGetChelseaPlayers(req, res) {
  try {
    console.log('⚽ Fetching Chelsea players from database...');

    const { data: players, error } = await supabase
      .from('chelsea_players')
      .select('*')
      .order('position')
      .order('name');

    if (error) {
      console.error('Error fetching Chelsea players:', error);
      return res.status(500).json({ error: 'Failed to fetch Chelsea players' });
    }

    console.log(`✅ Fetched ${players?.length || 0} Chelsea players`);
    return res.status(200).json({ 
      success: true, 
      players: players || [],
      count: players?.length || 0
    });

  } catch (error) {
    console.error('❌ Get Chelsea players error:', error);
    return res.status(500).json({ error: 'Failed to fetch Chelsea players' });
  }
}

async function handleSyncChelseaPlayers(req, res) {
  try {
    console.log('🔄 Starting Chelsea players sync...');

    // Test Supabase connection first
    const { data: testConnection, error: connectionError } = await supabase
      .from('chelsea_players')
      .select('id')
      .limit(1);

    if (connectionError) {
      console.error('❌ Supabase connection failed:', connectionError);
      throw new Error(`Database connection failed: ${connectionError.message}`);
    }

    console.log('✅ Supabase connection verified');

    // First, get bootstrap data from FPL API
    console.log('📡 Fetching FPL bootstrap data...');
    const fplResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    
    if (!fplResponse.ok) {
      console.error(`❌ FPL API error: ${fplResponse.status} ${fplResponse.statusText}`);
      throw new Error(`FPL API error: ${fplResponse.status} - ${fplResponse.statusText}`);
    }

    const fplData = await fplResponse.json();
    const allPlayers = fplData.elements;
    const teams = fplData.teams;

    // Find Chelsea team ID (usually 8)
    const chelseaTeam = teams.find(team => 
      team.name === 'Chelsea' || team.short_name === 'CHE'
    );

    if (!chelseaTeam) {
      throw new Error('Chelsea team not found in FPL data');
    }

    // Filter Chelsea players
    const chelseaPlayers = allPlayers.filter(player => player.team === chelseaTeam.id);

    console.log(`📊 Found ${chelseaPlayers.length} Chelsea players in FPL API`);

    // Sync each player to database
    const syncedPlayers = [];
    
    for (const player of chelseaPlayers) {
      const playerData = {
        fpl_id: player.id,
        name: `${player.first_name} ${player.second_name}`.trim(),
        position: getPositionFromElementType(player.element_type),
        price: player.now_cost / 10, // FPL stores price in tenths
        total_points: player.total_points,
        goals_scored: player.goals_scored,
        assists: player.assists,
        clean_sheets: player.clean_sheets,
        goals_conceded: player.goals_conceded,
        own_goals: player.own_goals,
        penalties_saved: player.penalties_saved,
        penalties_missed: player.penalties_missed,
        yellow_cards: player.yellow_cards,
        red_cards: player.red_cards,
        saves: player.saves,
        bonus: player.bonus,
        bps: player.bps,
        influence: parseFloat(player.influence),
        creativity: parseFloat(player.creativity),
        threat: parseFloat(player.threat),
        ict_index: parseFloat(player.ict_index),
        starts: player.starts,
        expected_goals: parseFloat(player.expected_goals),
        expected_assists: parseFloat(player.expected_assists),
        expected_goal_involvements: parseFloat(player.expected_goal_involvements),
        expected_goals_conceded: parseFloat(player.expected_goals_conceded),
        minutes: player.minutes,
        form: parseFloat(player.form),
        dreamteam_count: player.dreamteam_count,
        value_form: parseFloat(player.value_form),
        value_season: parseFloat(player.value_season),
        transfers_in: player.transfers_in,
        transfers_out: player.transfers_out,
        transfers_in_event: player.transfers_in_event,
        transfers_out_event: player.transfers_out_event,
        selected_by_percent: parseFloat(player.selected_by_percent),
        ep_this: parseFloat(player.ep_this),
        ep_next: parseFloat(player.ep_next),
        special: player.special,
        in_dreamteam: player.in_dreamteam,
        status: player.status,
        news: player.news,
        news_added: player.news_added,
        chance_of_playing_this_round: player.chance_of_playing_this_round,
        chance_of_playing_next_round: player.chance_of_playing_next_round,
        is_available: player.status === 'a' && player.chance_of_playing_this_round !== 0
      };

      // Upsert player (insert or update if exists)
      const { data: syncedPlayer, error } = await supabase
        .from('chelsea_players')
        .upsert(playerData, { 
          onConflict: 'fpl_id',
          ignoreDuplicates: false 
        })
        .select()
        .single();

      if (error) {
        console.error(`Error syncing player ${player.web_name}:`, error);
        continue;
      }

      syncedPlayers.push(syncedPlayer);
    }

    // Update sync log
    await supabase
      .from('fpl_sync_log')
      .insert({
        sync_type: 'chelsea_players',
        status: 'success',
        players_synced: syncedPlayers.length,
        sync_details: {
          total_fpl_players: chelseaPlayers.length,
          synced_players: syncedPlayers.length,
          chelsea_team_id: chelseaTeam.id
        }
      });

    console.log(`✅ Successfully synced ${syncedPlayers.length} Chelsea players`);
    return res.status(200).json({
      success: true,
      message: `Successfully synced ${syncedPlayers.length} Chelsea players`,
      data: {
        synced_count: syncedPlayers.length,
        total_fpl_count: chelseaPlayers.length,
        players: syncedPlayers,
        // Fields expected by FPLSync component
        playersCreated: syncedPlayers.length,
        playersUpdated: syncedPlayers.length, // All are upserts, so count as both
        totalPlayers: syncedPlayers.length
      }
    });

  } catch (error) {
    console.error('❌ Sync Chelsea players error:', error);
    
    // Log failed sync
    await supabase
      .from('fpl_sync_log')
      .insert({
        sync_type: 'chelsea_players',
        status: 'error',
        error_message: error.message
      });

    return res.status(500).json({ 
      error: 'Failed to sync Chelsea players',
      details: error.message 
    });
  }
}

async function handleLoginSync(req, res) {
  try {
    console.log('🔐 Performing login sync...');

    // Check if we've synced recently (within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: recentSync } = await supabase
      .from('fpl_sync_log')
      .select('created_at')
      .eq('sync_type', 'chelsea_players')
      .eq('status', 'success')
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (recentSync) {
      console.log('⏰ Recent sync found, skipping automatic sync');
      return res.status(200).json({
        success: true,
        message: 'Recent sync found, skipping automatic sync',
        last_sync: recentSync.created_at
      });
    }

    // Perform sync
    return await handleSyncChelseaPlayers(req, res);

  } catch (error) {
    console.error('❌ Login sync error:', error);
    return res.status(500).json({ error: 'Failed to perform login sync' });
  }
}

async function handleSyncStatus(req, res) {
  try {
    console.log('📊 Fetching sync status...');

    const { data: syncLogs, error } = await supabase
      .from('fpl_sync_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching sync status:', error);
      return res.status(500).json({ error: 'Failed to fetch sync status' });
    }

    const lastSync = syncLogs?.[0];
    const successfulSyncs = syncLogs?.filter(log => log.status === 'success') || [];
    const failedSyncs = syncLogs?.filter(log => log.status === 'error') || [];

    return res.status(200).json({
      success: true,
      data: {
        last_sync: lastSync,
        recent_syncs: syncLogs,
        stats: {
          total_syncs: syncLogs?.length || 0,
          successful_syncs: successfulSyncs.length,
          failed_syncs: failedSyncs.length,
          last_sync_time: lastSync?.created_at || null,
          last_sync_status: lastSync?.status || 'unknown'
        }
      }
    });

  } catch (error) {
    console.error('❌ Sync status error:', error);
    return res.status(500).json({ error: 'Failed to fetch sync status' });
  }
}

async function handleBootstrap(req, res) {
  try {
    console.log('🚀 Fetching FPL bootstrap data...');

    const fplResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    
    if (!fplResponse.ok) {
      throw new Error(`FPL API error: ${fplResponse.status}`);
    }

    const fplData = await fplResponse.json();

    // Extract key information
    const bootstrapData = {
      current_event: fplData.events?.find(event => event.is_current)?.id || 1,
      next_event: fplData.events?.find(event => event.is_next)?.id || 1,
      total_players: fplData.total_players,
      teams: fplData.teams?.map(team => ({
        id: team.id,
        name: team.name,
        short_name: team.short_name,
        code: team.code
      })),
      element_types: fplData.element_types?.map(type => ({
        id: type.id,
        plural_name: type.plural_name,
        singular_name: type.singular_name,
        singular_name_short: type.singular_name_short
      }))
    };

    return res.status(200).json({
      success: true,
      data: bootstrapData
    });

  } catch (error) {
    console.error('❌ Bootstrap error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch bootstrap data',
      details: error.message 
    });
  }
}

async function handleCurrentGameweek(req, res) {
  try {
    console.log('📅 Fetching current gameweek...');

    const fplResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    
    if (!fplResponse.ok) {
      throw new Error(`FPL API error: ${fplResponse.status}`);
    }

    const fplData = await fplResponse.json();
    const currentEvent = fplData.events?.find(event => event.is_current);
    const nextEvent = fplData.events?.find(event => event.is_next);

    return res.status(200).json({
      success: true,
      data: {
        currentGameweek: currentEvent?.id || 1,
        nextGameweek: nextEvent?.id || 2,
        current_event: currentEvent,
        next_event: nextEvent
      }
    });

  } catch (error) {
    console.error('❌ Current gameweek error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch current gameweek',
      details: error.message 
    });
  }
}

async function handleLiveScores(req, res) {
  try {
    console.log('🔴 Fetching live scores...');

    // Get current gameweek first
    const bootstrapResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    const bootstrapData = await bootstrapResponse.json();
    const currentGameweek = bootstrapData.events?.find(event => event.is_current)?.id || 1;

    // Get live scores for current gameweek
    const liveResponse = await fetch(`https://fantasy.premierleague.com/api/event/${currentGameweek}/live/`);
    
    if (!liveResponse.ok) {
      throw new Error(`FPL Live API error: ${liveResponse.status}`);
    }

    const liveData = await liveResponse.json();

    // Get our Chelsea players to filter live data
    const { data: chelseaPlayers } = await supabase
      .from('chelsea_players')
      .select('fpl_id, name, assigned_to_user_id, is_captain, is_vice_captain');

    // Filter live data for Chelsea players only
    const chelseaLiveData = liveData.elements?.filter(element => 
      chelseaPlayers?.some(player => player.fpl_id === element.id)
    ) || [];

    // Calculate team scores for users
    const teamScores = [];
    const userPlayers = {};

    // Group players by user
    chelseaPlayers?.forEach(player => {
      if (player.assigned_to_user_id) {
        if (!userPlayers[player.assigned_to_user_id]) {
          userPlayers[player.assigned_to_user_id] = [];
        }
        userPlayers[player.assigned_to_user_id].push(player);
      }
    });

    // Calculate scores for each user
    Object.entries(userPlayers).forEach(([userId, players]) => {
      let totalScore = 0;
      const playerScores = [];

      players.forEach(player => {
        const liveStats = chelseaLiveData.find(live => live.id === player.fpl_id);
        const playerScore = liveStats?.stats?.total_points || 0;
        
        // Apply captain/vice-captain multipliers
        let finalScore = playerScore;
        if (player.is_captain) finalScore *= 2;
        else if (player.is_vice_captain) finalScore *= 1.5;

        totalScore += finalScore;
        playerScores.push({
          playerId: player.fpl_id,
          playerName: player.name,
          score: playerScore,
          finalScore: finalScore,
          isCaptain: player.is_captain,
          isViceCaptain: player.is_vice_captain
        });
      });

      teamScores.push({
        userId,
        totalScore: Math.round(totalScore),
        playerScores,
        teamSize: players.length
      });
    });

    return res.status(200).json({
      success: true,
      data: {
        gameweek: currentGameweek,
        teamScores,
        chelseaLiveData,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Live scores error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch live scores',
      details: error.message 
    });
  }
}

async function handleDashboard(req, res) {
  try {
    console.log('📊 Fetching dashboard data...');

    // Get basic stats
    const { data: playerCount } = await supabase
      .from('chelsea_players')
      .select('id', { count: 'exact' });

    const { data: userCount } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact' });

    const { data: allocatedCount } = await supabase
      .from('chelsea_players')
      .select('id', { count: 'exact' })
      .not('assigned_to_user_id', 'is', null);

    // Get recent sync status
    const { data: lastSync } = await supabase
      .from('fpl_sync_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return res.status(200).json({
      success: true,
      data: {
        stats: {
          total_players: playerCount?.length || 0,
          total_users: userCount?.length || 0,
          allocated_players: allocatedCount?.length || 0,
          available_players: (playerCount?.length || 0) - (allocatedCount?.length || 0)
        },
        last_sync: lastSync,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Dashboard error:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
}

// ========== GAMEWEEK SCORES HANDLERS ==========

async function handleGetUserScores(req, res) {
  try {
    const { userId, gameweek, season = '2024-25' } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log('📊 Fetching user scores:', { userId, gameweek, season });

    // Get user's allocated players
    const { data: userPlayers, error } = await supabase
      .from('chelsea_players')
      .select('*')
      .eq('assigned_to_user_id', userId);

    if (error) {
      console.error('Error fetching user players:', error);
      return res.status(500).json({ error: 'Failed to fetch user players' });
    }

    // Calculate scores
    const totalPoints = userPlayers?.reduce((sum, player) => {
      const competitionPoints = Math.max(0, (player.total_points || 0) - (player.baseline_points || 0));
      if (player.is_captain) return sum + (competitionPoints * 2);
      if (player.is_vice_captain) return sum + (competitionPoints * 1.5);
      return sum + competitionPoints;
    }, 0) || 0;

    return res.status(200).json({
      success: true,
      data: {
        userId,
        gameweek: gameweek || 'current',
        season,
        totalPoints: Math.round(totalPoints),
        playerCount: userPlayers?.length || 0,
        players: userPlayers || []
      }
    });

  } catch (error) {
    console.error('❌ Get user scores error:', error);
    return res.status(500).json({ error: 'Failed to fetch user scores' });
  }
}

async function handleGetGameweekLeaderboard(req, res) {
  try {
    const { gameweek, season = '2024-25' } = req.query;

    console.log('🏆 Fetching gameweek leaderboard:', { gameweek, season });

    // Get all users with their players
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        email,
        first_name,
        last_name
      `);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    const leaderboard = [];

    for (const user of users) {
      const { data: userPlayers } = await supabase
        .from('chelsea_players')
        .select('*')
        .eq('assigned_to_user_id', user.id);

      const totalPoints = userPlayers?.reduce((sum, player) => {
        const competitionPoints = Math.max(0, (player.total_points || 0) - (player.baseline_points || 0));
        if (player.is_captain) return sum + (competitionPoints * 2);
        if (player.is_vice_captain) return sum + (competitionPoints * 1.5);
        return sum + competitionPoints;
      }, 0) || 0;

      leaderboard.push({
        userId: user.id,
        username: user.first_name || user.email,
        email: user.email,
        totalPoints: Math.round(totalPoints),
        playerCount: userPlayers?.length || 0
      });
    }

    // Sort by points
    leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);

    return res.status(200).json({
      success: true,
      data: {
        gameweek: gameweek || 'current',
        season,
        leaderboard,
        totalUsers: leaderboard.length
      }
    });

  } catch (error) {
    console.error('❌ Get gameweek leaderboard error:', error);
    return res.status(500).json({ error: 'Failed to fetch gameweek leaderboard' });
  }
}

async function handleGetUserHistory(req, res) {
  try {
    const { userId, season = '2024-25' } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log('📈 Fetching user history:', { userId, season });

    // Get user's performance history from user_team_performance table
    const { data: history, error } = await supabase
      .from('user_team_performance')
      .select('*')
      .eq('user_id', userId)
      .order('gameweek', { ascending: true });

    if (error) {
      console.error('Error fetching user history:', error);
      return res.status(500).json({ error: 'Failed to fetch user history' });
    }

    return res.status(200).json({
      success: true,
      data: {
        userId,
        season,
        history: history || [],
        totalGameweeks: history?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ Get user history error:', error);
    return res.status(500).json({ error: 'Failed to fetch user history' });
  }
}

// ========== PLAYER OWNERSHIP & SCORES HANDLERS ==========

async function handleGetPlayerScores(req, res) {
  try {
    const { gameweek, season = '2024-25' } = req.query;

    console.log('⚽ Fetching player scores:', { gameweek, season });

    const { data: players, error } = await supabase
      .from('chelsea_players')
      .select('*')
      .order('total_points', { ascending: false });

    if (error) {
      console.error('Error fetching player scores:', error);
      return res.status(500).json({ error: 'Failed to fetch player scores' });
    }

    return res.status(200).json({
      success: true,
      data: {
        gameweek: gameweek || 'current',
        season,
        players: players || [],
        totalPlayers: players?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ Get player scores error:', error);
    return res.status(500).json({ error: 'Failed to fetch player scores' });
  }
}

async function handleGetUserTeamScores(req, res) {
  try {
    const { gameweek, season = '2024-25' } = req.query;

    console.log('👥 Fetching user team scores:', { gameweek, season });

    // Get all users and their teams
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        email,
        first_name,
        last_name
      `);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    const teamScores = [];

    for (const user of users) {
      const { data: userPlayers } = await supabase
        .from('chelsea_players')
        .select('*')
        .eq('assigned_to_user_id', user.id);

      if (userPlayers && userPlayers.length > 0) {
        const totalPoints = userPlayers.reduce((sum, player) => {
          const competitionPoints = Math.max(0, (player.total_points || 0) - (player.baseline_points || 0));
          if (player.is_captain) return sum + (competitionPoints * 2);
          if (player.is_vice_captain) return sum + (competitionPoints * 1.5);
          return sum + competitionPoints;
        }, 0);

        teamScores.push({
          userId: user.id,
          username: user.first_name || user.email,
          email: user.email,
          totalPoints: Math.round(totalPoints),
          players: userPlayers,
          playerCount: userPlayers.length
        });
      }
    }

    // Sort by total points
    teamScores.sort((a, b) => b.totalPoints - a.totalPoints);

    return res.status(200).json({
      success: true,
      data: {
        gameweek: gameweek || 'current',
        season,
        teamScores,
        totalTeams: teamScores.length
      }
    });

  } catch (error) {
    console.error('❌ Get user team scores error:', error);
    return res.status(500).json({ error: 'Failed to fetch user team scores' });
  }
}

async function handleGetGameweekBreakdown(req, res) {
  try {
    const { gameweek, season = '2024-25' } = req.query;

    console.log('📊 Fetching gameweek breakdown:', { gameweek, season });

    // Get gameweek results if they exist
    const { data: gameweekResults, error } = await supabase
      .from('gameweek_results')
      .select('*')
      .eq('gameweek', gameweek || 1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching gameweek results:', error);
      return res.status(500).json({ error: 'Failed to fetch gameweek breakdown' });
    }

    // Get current player stats as fallback
    const { data: players } = await supabase
      .from('chelsea_players')
      .select('*')
      .order('total_points', { ascending: false });

    const breakdown = {
      gameweek: gameweek || 1,
      season,
      results: gameweekResults?.results || null,
      players: players || [],
      stats: {
        totalPlayers: players?.length || 0,
        averagePoints: players?.length ? 
          Math.round(players.reduce((sum, p) => sum + (p.total_points || 0), 0) / players.length) : 0,
        highestScore: Math.max(...(players?.map(p => p.total_points || 0) || [0])),
        lowestScore: Math.min(...(players?.map(p => p.total_points || 0) || [0]))
      }
    };

    return res.status(200).json({
      success: true,
      data: breakdown
    });

  } catch (error) {
    console.error('❌ Get gameweek breakdown error:', error);
    return res.status(500).json({ error: 'Failed to fetch gameweek breakdown' });
  }
}

// ========== TEST & UTILITY FUNCTIONS ==========

async function handleTestConnection(req, res) {
  try {
    console.log('🧪 Testing API connections...');

    const results = {
      timestamp: new Date().toISOString(),
      environment: {
        supabaseUrl: supabaseUrl ? 'Set' : 'Missing',
        supabaseKey: supabaseKey ? 'Set' : 'Missing'
      },
      tests: {}
    };

    // Test Supabase connection
    try {
      const { data, error } = await supabase
        .from('chelsea_players')
        .select('id')
        .limit(1);

      results.tests.supabase = {
        status: error ? 'Failed' : 'Success',
        error: error?.message || null,
        recordCount: data?.length || 0
      };
    } catch (err) {
      results.tests.supabase = {
        status: 'Failed',
        error: err.message
      };
    }

    // Test FPL API connection
    try {
      const fplResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
      const fplData = await fplResponse.json();
      
      results.tests.fplApi = {
        status: fplResponse.ok ? 'Success' : 'Failed',
        statusCode: fplResponse.status,
        playerCount: fplData.elements?.length || 0,
        teamCount: fplData.teams?.length || 0
      };
    } catch (err) {
      results.tests.fplApi = {
        status: 'Failed',
        error: err.message
      };
    }

    return res.status(200).json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('❌ Test connection error:', error);
    return res.status(500).json({ 
      error: 'Test connection failed',
      details: error.message 
    });
  }
}

function getPositionFromElementType(elementType) {
  switch (elementType) {
    case 1: return 'GK';
    case 2: return 'DEF';
    case 3: return 'MID';
    case 4: return 'FWD';
    default: return 'UNK';
  }
}

async function handleSyncGameweekPoints(req, res) {
  try {
    console.log('🔄 Starting gameweek points sync...');
    
    // Get all Chelsea players from our database
    const { data: chelseaPlayers, error: playersError } = await supabase
      .from('chelsea_players')
      .select('fpl_id, name');
    
    if (playersError) {
      console.error('Error fetching Chelsea players:', playersError);
      return res.status(500).json({ error: 'Failed to fetch Chelsea players' });
    }
    
    console.log(`📊 Found ${chelseaPlayers.length} Chelsea players to sync`);
    
    let syncedGameweeks = 0;
    let totalRecords = 0;
    
    // Sync gameweeks 4 and 5 for each player
    for (const player of chelseaPlayers) {
      console.log(`🔄 Syncing ${player.name} (FPL ID: ${player.fpl_id})`);
      
      for (let gameweek = 4; gameweek <= 5; gameweek++) {
        try {
          // Fetch individual gameweek data from FPL API
          const gwResponse = await fetch(
            `https://fantasy.premierleague.com/api/element-summary/${player.fpl_id}/`
          );
          
          if (!gwResponse.ok) {
            console.warn(`⚠️ Failed to fetch data for ${player.name} GW${gameweek}: ${gwResponse.status}`);
            continue;
          }
          
          const gwData = await gwResponse.json();
          const gameweekData = gwData.history.find(h => h.round === gameweek);
          
          if (!gameweekData) {
            console.warn(`⚠️ No data found for ${player.name} GW${gameweek}`);
            continue;
          }
          
          // Insert/update gameweek points
          const { error: upsertError } = await supabase
            .from('gameweek_points')
            .upsert({
              fpl_id: player.fpl_id,
              player_name: player.name,
              gameweek: gameweek,
              points: gameweekData.total_points,
              minutes: gameweekData.minutes,
              goals_scored: gameweekData.goals_scored,
              assists: gameweekData.assists,
              clean_sheets: gameweekData.clean_sheets,
              goals_conceded: gameweekData.goals_conceded,
              own_goals: gameweekData.own_goals,
              penalties_saved: gameweekData.penalties_saved,
              penalties_missed: gameweekData.penalties_missed,
              yellow_cards: gameweekData.yellow_cards,
              red_cards: gameweekData.red_cards,
              saves: gameweekData.saves,
              bonus: gameweekData.bonus,
              bps: gameweekData.bps,
              influence: parseFloat(gameweekData.influence || 0),
              creativity: parseFloat(gameweekData.creativity || 0),
              threat: parseFloat(gameweekData.threat || 0),
              ict_index: parseFloat(gameweekData.ict_index || 0),
              starts: gameweekData.starts,
              expected_goals: parseFloat(gameweekData.expected_goals || 0),
              expected_assists: parseFloat(gameweekData.expected_assists || 0),
              expected_goal_involvements: parseFloat(gameweekData.expected_goal_involvements || 0),
              expected_goals_conceded: parseFloat(gameweekData.expected_goals_conceded || 0),
              value: gameweekData.value,
              transfers_balance: gameweekData.transfers_balance,
              selected: gameweekData.selected,
              transfers_in: gameweekData.transfers_in,
              transfers_out: gameweekData.transfers_out,
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'fpl_id,gameweek'
            });
          
          if (upsertError) {
            console.error(`❌ Error upserting ${player.name} GW${gameweek}:`, upsertError);
          } else {
            console.log(`✅ Synced ${player.name} GW${gameweek}: ${gameweekData.total_points} points`);
            totalRecords++;
          }
          
          // Small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (gwError) {
          console.error(`❌ Error processing ${player.name} GW${gameweek}:`, gwError);
        }
      }
      
      syncedGameweeks++;
    }
    
    console.log(`✅ Gameweek sync completed: ${totalRecords} records for ${syncedGameweeks} players`);
    
    return res.status(200).json({
      success: true,
      data: {
        playersProcessed: syncedGameweeks,
        recordsCreated: totalRecords,
        gameweeksSync: [4, 5],
        message: `Synced individual gameweek points for GW4-5`
      }
    });
    
  } catch (error) {
    console.error('❌ Gameweek sync error:', error);
    return res.status(500).json({ 
      error: 'Failed to sync gameweek points',
      details: error.message 
    });
  }
}

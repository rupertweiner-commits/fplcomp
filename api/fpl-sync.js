import { createClient } from '@supabase/supabase-js';

// Use service role key for admin operations like sync
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
      case 'sync-chelsea-players':
        return await handleSyncChelseaPlayers(req, res);
      case 'sync-status':
        return await handleSyncStatus(req, res);
      case 'get-chelsea-players':
        return await handleGetChelseaPlayers(req, res);
      case 'daily-sync':
        return await handleDailySync(req, res);
      case 'login-sync':
        return await handleLoginSync(req, res);
      case 'bootstrap':
        return await handleBootstrap(req, res);
      case 'current-gameweek':
        return await handleCurrentGameweek(req, res);
      case 'dashboard':
        return await handleDashboard(req, res);
      case 'live-scores':
        return await handleLiveScores(req, res);
      case 'test':
        return res.status(200).json({ 
          success: true, 
          message: 'FPL Consolidated API is working - VERSION 3.0',
          timestamp: new Date().toISOString(),
          version: '3.0',
          environment: {
            hasSupabaseUrl: !!process.env.SUPABASE_URL,
            hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY
          }
        });
      default:
        return res.status(400).json({ error: 'Invalid action. Available actions: sync-chelsea-players, sync-status, get-chelsea-players, daily-sync, login-sync, bootstrap, current-gameweek, dashboard, live-scores, test' });
    }

  } catch (error) {
    console.error('FPL Consolidated API error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

async function handleSyncChelseaPlayers(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔄 Starting FPL sync...');

    // Log sync start
    const { data: syncLog, error: logError } = await supabase
      .from('fpl_sync_log')
      .insert({
        sync_type: 'chelsea_players',
        status: 'in_progress',
        sync_started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (logError) {
      console.warn('Failed to log sync start:', logError);
    }

    console.log('🌐 Fetching FPL bootstrap data...');
    
    // Fetch FPL bootstrap data
    const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    if (!response.ok) {
      throw new Error(`FPL API error: ${response.status} ${response.statusText}`);
    }

    console.log('📥 Parsing FPL JSON data...');
    const data = await response.json();
    console.log(`✅ FPL data fetched successfully, elements count: ${data.elements.length}`);

    // Find Chelsea team ID
    const chelseaTeam = data.teams.find(team => 
      team.name.toLowerCase().includes('chelsea')
    );

    if (!chelseaTeam) {
      throw new Error('Chelsea team not found in FPL data');
    }

    console.log(`📊 Found Chelsea team: ${chelseaTeam.name} (ID: ${chelseaTeam.id})`);

    // Filter Chelsea players - include ALL players regardless of availability
    const chelseaPlayers = data.elements.filter(player => 
      player.team === chelseaTeam.id
    );

    console.log(`📊 Found ${chelseaPlayers.length} Chelsea players in FPL data`);
    
    // Log availability breakdown
    const availableCount = chelseaPlayers.filter(p => p.status === 'a').length;
    const unavailableCount = chelseaPlayers.filter(p => p.status !== 'a').length;
    const injuredCount = chelseaPlayers.filter(p => p.news && p.news.toLowerCase().includes('injur')).length;
    
    console.log(`📊 Availability breakdown:`);
    console.log(`   - Available: ${availableCount}`);
    console.log(`   - Unavailable: ${unavailableCount}`);
    console.log(`   - With injury news: ${injuredCount}`);

    // Clear existing Chelsea players
    console.log('🗑️ Clearing existing Chelsea players...');
    const { error: deleteError } = await supabase
      .from('chelsea_players')
      .delete()
      .neq('id', 0); // Delete all records

    if (deleteError) {
      throw new Error(`Failed to clear existing data: ${deleteError.message}`);
    }

    console.log('✅ Existing data cleared successfully');

    // Prepare players data for insertion
    const playersToInsert = chelseaPlayers.map(player => ({
      id: player.id,
      fpl_id: player.id,
      name: player.web_name,
      first_name: player.first_name,
      second_name: player.second_name,
      web_name: player.web_name,
      position: player.element_type === 1 ? 'GK' : 
                player.element_type === 2 ? 'DEF' : 
                player.element_type === 3 ? 'MID' : 'FWD',
      element_type: player.element_type,
      position_name: player.element_type === 1 ? 'Goalkeeper' : 
                     player.element_type === 2 ? 'Defender' : 
                     player.element_type === 3 ? 'Midfielder' : 'Forward',
      team: player.team,
      team_name: chelseaTeam.name,
      price: player.now_cost,
      now_cost: player.now_cost,
      total_points: player.total_points,
      form: player.form,
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
      influence: player.influence,
      creativity: player.creativity,
      threat: player.threat,
      ict_index: player.ict_index,
      starts: player.starts,
      minutes: player.minutes,
      is_available: player.status === 'a', // Available only if status is 'a' (available)
      availability_status: player.status === 'a' ? 'Available' : 
                          player.status === 'u' ? 'Unavailable' : 
                          player.status === 'd' ? 'Doubtful' : 
                          player.status === 'i' ? 'Injured' : 
                          player.status === 's' ? 'Suspended' : 'Unknown',
      availability_reason: player.news || null, // Injury/news description
      chance_of_playing_this_round: player.chance_of_playing_this_round,
      chance_of_playing_next_round: player.chance_of_playing_next_round,
      selected_by_percent: player.selected_by_percent,
      news_added: player.news_added,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    console.log(`💾 Inserting ${playersToInsert.length} Chelsea players...`);

    // Insert new players
    const { data: insertedPlayers, error: insertError } = await supabase
      .from('chelsea_players')
      .insert(playersToInsert)
      .select();

    if (insertError) {
      throw new Error(`Failed to insert players: ${insertError.message}`);
    }

    console.log(`✅ Successfully inserted ${insertedPlayers.length} players`);

    // Update sync log if it exists
    if (syncLog && syncLog.id) {
      const { error: updateLogError } = await supabase
        .from('fpl_sync_log')
        .update({
          status: 'completed',
          sync_completed_at: new Date().toISOString(),
          players_created: insertedPlayers.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', syncLog.id);

      if (updateLogError) {
        console.warn('Failed to update sync log:', updateLogError);
      }
    } else {
      console.warn('No sync log to update - sync log creation failed');
    }

    res.status(200).json({
      success: true,
      message: 'Chelsea players synced successfully',
      data: {
        players_created: insertedPlayers.length,
        chelsea_team: chelseaTeam.name,
        sync_log_id: syncLog.id,
        availability_breakdown: {
          total: chelseaPlayers.length,
          available: availableCount,
          unavailable: unavailableCount,
          injured: injuredCount
        },
        players: insertedPlayers
      }
    });

  } catch (error) {
    console.error('❌ Sync Chelsea players error:', error);

    // Update sync log with error
    try {
      await supabase
        .from('fpl_sync_log')
        .update({
          status: 'failed',
          error_message: error.message,
          sync_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('sync_type', 'chelsea_players')
        .order('created_at', { ascending: false })
        .limit(1);
    } catch (logError) {
      console.error('Failed to log sync error:', logError);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to sync Chelsea players',
      details: error.message
    });
  }
}

async function handleSyncStatus(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get latest sync log
    const { data: syncLog, error: syncError } = await supabase
      .from('fpl_sync_log')
      .select('*')
      .eq('sync_type', 'chelsea_players')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (syncError && syncError.code !== 'PGRST116') {
      throw syncError;
    }

    // Get current player count
    const { count: playerCount, error: countError } = await supabase
      .from('chelsea_players')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw countError;
    }

    res.status(200).json({
      success: true,
      data: {
        sync_log: syncLog,
        current_player_count: playerCount,
        last_sync: syncLog?.sync_completed_at || null,
        status: syncLog?.status || 'never_synced'
      }
    });

  } catch (error) {
    console.error('Sync status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync status',
      details: error.message
    });
  }
}

async function handleGetChelseaPlayers(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: players, error: playersError } = await supabase
      .from('chelsea_players')
      .select('*')
      .eq('is_available', true)
      .order('total_points', { ascending: false });

    if (playersError) {
      throw playersError;
    }

    res.status(200).json({
      success: true,
      data: {
        players,
        count: players.length
      }
    });

  } catch (error) {
    console.error('Get Chelsea players error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get Chelsea players',
      details: error.message
    });
  }
}

async function handleDailySync(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🕐 Starting daily FPL sync');

    // Check if we've already synced today
    const today = new Date().toISOString().split('T')[0];
    const { data: todaySync } = await supabase
      .from('fpl_sync_log')
      .select('*')
      .eq('sync_type', 'daily')
      .gte('created_at', `${today}T00:00:00.000Z`)
      .single();

    if (todaySync) {
      return res.status(200).json({
        success: true,
        message: 'Daily sync already completed today',
        lastSync: todaySync.created_at
      });
    }

    // Call the existing sync function
    const syncResult = await handleSyncChelseaPlayers(req, res);
    
    // Log the daily sync
    await supabase
      .from('fpl_sync_log')
      .insert({
        sync_type: 'daily',
        status: 'success',
        completed_at: new Date().toISOString()
      });

    console.log('✅ Daily sync completed successfully');
    return syncResult;

  } catch (error) {
    console.error('❌ Daily sync failed:', error);
    
    // Log the failure
    await supabase
      .from('fpl_sync_log')
      .insert({
        sync_type: 'daily',
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      });

    res.status(500).json({
      success: false,
      error: 'Daily sync failed',
      details: error.message
    });
  }
}

async function handleLoginSync(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('👤 Starting login-triggered FPL sync');

    // Check if we've synced recently (within last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentSync } = await supabase
      .from('fpl_sync_log')
      .select('*')
      .eq('sync_type', 'login')
      .gte('created_at', oneHourAgo)
      .single();

    if (recentSync) {
      return res.status(200).json({
        success: true,
        message: 'Login sync already completed recently',
        lastSync: recentSync.created_at
      });
    }

    // Call the existing sync function
    const syncResult = await handleSyncChelseaPlayers(req, res);
    
    // Log the login sync
    await supabase
      .from('fpl_sync_log')
      .insert({
        sync_type: 'login',
        status: 'success',
        completed_at: new Date().toISOString()
      });

    console.log('✅ Login sync completed successfully');
    return syncResult;

  } catch (error) {
    console.error('❌ Login sync failed:', error);
    
    // Log the failure
    await supabase
      .from('fpl_sync_log')
      .insert({
        sync_type: 'login',
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      });

    res.status(500).json({
      success: false,
      error: 'Login sync failed',
      details: error.message
    });
  }
}

// FPL Data Handlers (merged from fpl.js)
async function handleBootstrap(req, res) {
  try {
    // Return basic bootstrap data
    const bootstrapData = {
      events: [
        {
          id: 1,
          name: "Gameweek 1",
          deadline_time: "2024-08-16T18:30:00Z",
          finished: false,
          is_current: true
        }
      ],
      teams: [
        { id: 1, name: "Arsenal", short_name: "ARS" },
        { id: 2, name: "Chelsea", short_name: "CHE" },
        { id: 3, name: "Liverpool", short_name: "LIV" },
        { id: 4, name: "Manchester City", short_name: "MCI" },
        { id: 5, name: "Manchester United", short_name: "MUN" }
      ],
      elements: [
        {
          id: 1,
          first_name: "Mohamed",
          second_name: "Salah",
          web_name: "Salah",
          element_type: 3, // Midfielder
          team: 3, // Liverpool
          now_cost: 130, // £13.0M
          total_points: 0,
          selected_by_percent: "45.2"
        },
        {
          id: 2,
          first_name: "Erling",
          second_name: "Haaland",
          web_name: "Haaland",
          element_type: 4, // Forward
          team: 4, // Manchester City
          now_cost: 140, // £14.0M
          total_points: 0,
          selected_by_percent: "52.1"
        }
      ],
      element_types: [
        { id: 1, singular_name: "Goalkeeper", plural_name: "Goalkeepers" },
        { id: 2, singular_name: "Defender", plural_name: "Defenders" },
        { id: 3, singular_name: "Midfielder", plural_name: "Midfielders" },
        { id: 4, singular_name: "Forward", plural_name: "Forwards" }
      ]
    };

    res.status(200).json({
      success: true,
      data: bootstrapData
    });

  } catch (error) {
    throw error;
  }
}

async function handleCurrentGameweek(req, res) {
  try {
    const currentGameweek = {
      id: 1,
      name: "Gameweek 1",
      deadline_time: "2024-08-16T18:30:00Z",
      finished: false,
      is_current: true
    };

    res.status(200).json({
      success: true,
      data: currentGameweek
    });

  } catch (error) {
    throw error;
  }
}

async function handleDashboard(req, res) {
  try {
    const dashboardData = {
      current_gameweek: 1,
      total_managers: 4,
      total_players: 2,
      recent_activity: [
        {
          id: 1,
          type: "player_allocated",
          player_name: "Mohamed Salah",
          user_name: "Rupert",
          timestamp: new Date().toISOString()
        }
      ],
      top_performers: [
        {
          id: 1,
          name: "Mohamed Salah",
          points: 0,
          team: "Liverpool"
        }
      ]
    };

    res.status(200).json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    throw error;
  }
}

async function handleLiveScores(req, res) {
  try {
    const liveScores = {
      gameweek: 1,
      fixtures: [
        {
          id: 1,
          home_team: "Arsenal",
          away_team: "Chelsea",
          home_score: null,
          away_score: null,
          status: "scheduled",
          kickoff_time: "2024-08-16T15:00:00Z"
        }
      ],
      players: [
        {
          id: 1,
          name: "Mohamed Salah",
          points: 0,
          team: "Liverpool"
        }
      ]
    };

    res.status(200).json({
      success: true,
      data: liveScores
    });

  } catch (error) {
    throw error;
  }
}

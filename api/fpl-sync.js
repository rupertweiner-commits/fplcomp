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
        return res.status(400).json({ error: 'Invalid action. Available actions: sync-chelsea-players, sync-status, get-chelsea-players, test' });
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
        sync_started_at: new Date().toISOString(),
        created_at: new Date().toISOString()
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

    // Filter Chelsea players
    const chelseaPlayers = data.elements.filter(player => 
      player.team === chelseaTeam.id && 
      player.status !== 'u' && // Not unavailable
      !player.news // No injury news
    );

    console.log(`📊 Found ${chelseaPlayers.length} Chelsea players in FPL data`);

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
      is_available: true,
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

    // Update sync log
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

    res.status(200).json({
      success: true,
      message: 'Chelsea players synced successfully',
      data: {
        players_created: insertedPlayers.length,
        chelsea_team: chelseaTeam.name,
        sync_log_id: syncLog.id,
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

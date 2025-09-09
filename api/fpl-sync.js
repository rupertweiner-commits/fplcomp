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
      case 'test':
        return res.status(200).json({ 
          success: true, 
          message: 'FPL Sync API is working',
          timestamp: new Date().toISOString(),
          environment: {
            hasSupabaseUrl: !!process.env.SUPABASE_URL,
            hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY
          }
        });
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('FPL Sync API error:', error);
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
    console.log('🔑 Using service role key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

    // Fetch FPL bootstrap data
    console.log('🌐 Fetching FPL bootstrap data...');
    const fplResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    if (!fplResponse.ok) {
      console.error('❌ FPL API response not OK:', fplResponse.status, fplResponse.statusText);
      throw new Error(`FPL API error: ${fplResponse.status}`);
    }
    
    console.log('📥 Parsing FPL JSON data...');
    const fplData = await fplResponse.json();
    console.log('✅ FPL data fetched successfully, elements count:', fplData.elements?.length || 0);

    // Debug: Check what teams are available
    const teams = fplData.teams || [];
    console.log('🏟️ Available teams:', teams.map(t => `${t.id}: ${t.name}`));
    
    // Find Chelsea team ID
    const chelseaTeam = teams.find(team => 
      team.name.toLowerCase().includes('chelsea') || 
      team.short_name.toLowerCase().includes('che')
    );
    console.log('🔵 Chelsea team found:', chelseaTeam);
    
    if (!chelseaTeam) {
      throw new Error('Chelsea team not found in FPL data');
    }
    
    // Get Chelsea players
    const chelseaPlayers = fplData.elements.filter(player => player.team === chelseaTeam.id);
    console.log(`📊 Found ${chelseaPlayers.length} Chelsea players in FPL data`);
    console.log('📊 Sample Chelsea players:', chelseaPlayers.slice(0, 3).map(p => `${p.first_name} ${p.second_name} (Team: ${p.team})`));

    // Clear existing data
    console.log('🗑️ Clearing existing Chelsea players...');
    const { error: deleteError } = await supabase
      .from('chelsea_players')
      .delete()
      .neq('id', 0);

    if (deleteError) {
      console.error('❌ Delete error:', deleteError);
      throw new Error(`Failed to clear existing data: ${deleteError.message}`);
    }
    console.log('✅ Cleared existing data');

    // Insert new data with comprehensive FPL statistics
    const playersToInsert = chelseaPlayers.map(player => ({
      // Basic info
      id: player.id, // Use FPL ID as primary key
      web_name: player.web_name || `${player.first_name} ${player.second_name}`,
      first_name: player.first_name,
      second_name: player.second_name,
      element_type: player.element_type,
      position_name: mapFPLPosition(player.element_type),
      team: player.team,
      team_name: chelseaTeam.name,
      
      // Pricing
      now_cost: player.now_cost,
      
      // Scoring statistics
      total_points: player.total_points || 0,
      event_points: player.event_points || 0,
      form: player.form || '0.0',
      selected_by_percent: player.selected_by_percent || '0.0',
      
      // Performance stats
      minutes: player.minutes || 0,
      goals_scored: player.goals_scored || 0,
      assists: player.assists || 0,
      clean_sheets: player.clean_sheets || 0,
      goals_conceded: player.goals_conceded || 0,
      own_goals: player.own_goals || 0,
      penalties_saved: player.penalties_saved || 0,
      penalties_missed: player.penalties_missed || 0,
      yellow_cards: player.yellow_cards || 0,
      red_cards: player.red_cards || 0,
      saves: player.saves || 0,
      bonus: player.bonus || 0,
      bps: player.bps || 0,
      
      // Advanced stats
      influence: player.influence || '0.0',
      creativity: player.creativity || '0.0',
      threat: player.threat || '0.0',
      ict_index: player.ict_index || '0.0',
      starts: player.starts || 0,
      expected_goals: player.expected_goals || '0.0',
      expected_assists: player.expected_assists || '0.0',
      expected_goal_involvements: player.expected_goal_involvements || '0.0',
      expected_goals_conceded: player.expected_goals_conceded || '0.0',
      
      // Rankings
      influence_rank: player.influence_rank,
      influence_rank_type: player.influence_rank_type,
      creativity_rank: player.creativity_rank,
      creativity_rank_type: player.creativity_rank_type,
      threat_rank: player.threat_rank,
      threat_rank_type: player.threat_rank_type,
      ict_index_rank: player.ict_index_rank,
      ict_index_rank_type: player.ict_index_rank_type,
      
      // Set pieces
      corners_and_indirect_freekicks_order: player.corners_and_indirect_freekicks_order,
      corners_and_indirect_freekicks_text: player.corners_and_indirect_freekicks_text,
      direct_freekicks_order: player.direct_freekicks_order,
      direct_freekicks_text: player.direct_freekicks_text,
      penalties_order: player.penalties_order,
      penalties_text: player.penalties_text,
      
      // Cost rankings
      now_cost_rank: player.now_cost_rank,
      now_cost_rank_type: player.now_cost_rank_type,
      form_rank: player.form_rank,
      form_rank_type: player.form_rank_type,
      points_per_game_rank: player.points_per_game_rank,
      points_per_game_rank_type: player.points_per_game_rank_type,
      selected_rank: player.selected_rank,
      selected_rank_type: player.selected_rank_type,
      
      // Transfers
      transfers_in: player.transfers_in || 0,
      transfers_out: player.transfers_out || 0,
      transfers_in_event: player.transfers_in_event || 0,
      transfers_out_event: player.transfers_out_event || 0,
      loans_in: player.loans_in || 0,
      loans_out: player.loans_out || 0,
      loaned_in: player.loaned_in || 0,
      loaned_out: player.loaned_out || 0,
      
      // Value stats
      value_form: player.value_form || '0.0',
      value_season: player.value_season || '0.0',
      cost_change_start: player.cost_change_start || 0,
      cost_change_event: player.cost_change_event || 0,
      cost_change_start_fall: player.cost_change_start_fall || 0,
      cost_change_event_fall: player.cost_change_event_fall || 0,
      
      // Dream team
      in_dreamteam: player.in_dreamteam || false,
      dreamteam_count: player.dreamteam_count || 0,
      points_per_game: player.points_per_game || '0.0',
      
      // Expected points
      ep_this: player.ep_this || '0.0',
      ep_next: player.ep_next || '0.0',
      
      // Status
      special: player.special || false,
      in_squad: player.in_squad || false,
      news: player.news || '',
      news_added: player.news_added ? new Date(player.news_added).toISOString() : null,
      chance_of_playing_this_round: player.chance_of_playing_this_round,
      chance_of_playing_next_round: player.chance_of_playing_next_round,
      status: player.status || 'a',
      photo: player.photo,
      code: player.code,
      
      // Timestamps
      last_updated: new Date().toISOString(),
      synced_at: new Date().toISOString()
    }));

    console.log(`📝 Inserting ${playersToInsert.length} players...`);
    console.log('📝 Sample player data:', JSON.stringify(playersToInsert[0], null, 2));
    const { data: insertedPlayers, error: insertError } = await supabase
      .from('chelsea_players')
      .insert(playersToInsert)
      .select();

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      throw new Error(`Failed to insert players: ${insertError.message}`);
    }

    console.log(`✅ Successfully inserted ${insertedPlayers?.length || 0} players`);

    // Log sync activity
    const { error: logError } = await supabase
      .from('fpl_sync_log')
      .insert({
        sync_type: 'players',
        status: 'completed',
        players_created: insertedPlayers?.length || 0,
        players_updated: 0,
        sync_started_at: new Date().toISOString(),
        sync_completed_at: new Date().toISOString()
      });

    if (logError) {
      console.warn('⚠️ Failed to log sync activity:', logError.message);
    }

    return res.status(200).json({
      success: true,
      message: `Chelsea players sync completed - ${insertedPlayers?.length || 0} players synced`,
      data: {
        playersCreated: insertedPlayers?.length || 0,
        totalPlayers: chelseaPlayers.length,
        chelseaTeamId: chelseaTeam.id,
        chelseaTeamName: chelseaTeam.name,
        players: insertedPlayers || []
      }
    });

  } catch (error) {
    console.error('❌ Sync Chelsea players error:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to sync Chelsea players',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

async function handleSyncStatus(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: status, error } = await supabase
      .from('fpl_sync_log')
      .select('*')
      .order('sync_started_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    res.status(200).json({
      success: true,
      data: status || null
    });

  } catch (error) {
    console.error('❌ Get sync status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync status',
      details: error.message
    });
  }
}

// Helper function to map FPL position codes
function mapFPLPosition(elementType) {
  const positionMap = {
    1: 'GK',
    2: 'DEF', 
    3: 'MID',
    4: 'FWD'
  };
  return positionMap[elementType] || 'MID';
}
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
          message: 'FPL Sync API is working - VERSION 2.0',
          timestamp: new Date().toISOString(),
          version: '2.0',
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

    // Insert new data using existing schema columns
    const playersToInsert = chelseaPlayers.map(player => ({
      // Use existing columns
      id: player.id, // FPL ID as primary key
      fpl_id: player.id, // Also store in fpl_id column
      name: player.web_name || `${player.first_name} ${player.second_name}`,
      full_name: `${player.first_name} ${player.second_name}`,
      position: mapFPLPosition(player.element_type),
      price: (player.now_cost / 10).toFixed(1), // Convert to decimal
      team_id: player.team,
      total_points: player.total_points || 0,
      form: player.form || 0.0,
      selected_by_percent: parseFloat(player.selected_by_percent) || 0.0,
      news: player.news || '',
      news_added: player.news_added ? new Date(player.news_added).toISOString() : null,
      chance_of_playing_this_round: player.chance_of_playing_this_round,
      chance_of_playing_next_round: player.chance_of_playing_next_round,
      is_available: true,
      last_updated: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
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
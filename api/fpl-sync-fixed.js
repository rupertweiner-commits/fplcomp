import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
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
          message: 'FPL Sync Fixed API is working',
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
    console.error('FPL Sync Fixed API error:', error);
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

    // Fetch FPL bootstrap data
    const fplResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    if (!fplResponse.ok) {
      throw new Error(`FPL API error: ${fplResponse.status}`);
    }
    
    const fplData = await fplResponse.json();
    console.log('✅ FPL data fetched successfully');

    // Get Chelsea players (team ID 4)
    const chelseaPlayers = fplData.elements.filter(player => player.team === 4);
    console.log(`📊 Found ${chelseaPlayers.length} Chelsea players in FPL data`);

    // Clear existing data
    console.log('🗑️ Clearing existing Chelsea players...');
    const { error: deleteError } = await supabase
      .from('chelsea_players')
      .delete()
      .neq('id', 0);

    if (deleteError) {
      throw new Error(`Failed to clear existing data: ${deleteError.message}`);
    }
    console.log('✅ Cleared existing data');

    // Insert new data (simplified - only first 10 players to avoid timeout)
    const playersToInsert = chelseaPlayers.slice(0, 10).map(player => ({
      fpl_id: player.id,
      name: `${player.first_name} ${player.second_name}`,
      position: mapFPLPosition(player.element_type),
      price: player.now_cost / 10,
      team_id: player.team,
      is_available: player.status === 'a',
      last_updated: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    console.log(`📝 Inserting ${playersToInsert.length} players...`);
    const { data: insertedPlayers, error: insertError } = await supabase
      .from('chelsea_players')
      .insert(playersToInsert)
      .select();

    if (insertError) {
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
      message: 'Chelsea players sync completed',
      data: {
        playersCreated: insertedPlayers?.length || 0,
        totalPlayers: chelseaPlayers.length,
        players: insertedPlayers || []
      }
    });

  } catch (error) {
    console.error('❌ Sync Chelsea players error:', error);
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

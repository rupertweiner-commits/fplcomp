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

    if (action === 'test') {
      return res.status(200).json({ 
        success: true, 
        message: 'FPL Sync Simple API is working',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'sync-chelsea-players') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      console.log('🔄 Starting simple FPL sync...');

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

      // Insert new data (simplified)
      const playersToInsert = chelseaPlayers.slice(0, 5).map(player => ({
        fpl_id: player.id,
        name: `${player.first_name} ${player.second_name}`,
        position: player.element_type === 1 ? 'GK' : player.element_type === 2 ? 'DEF' : player.element_type === 3 ? 'MID' : 'FWD',
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

      return res.status(200).json({
        success: true,
        message: 'Simple Chelsea players sync completed',
        data: {
          playersCreated: insertedPlayers?.length || 0,
          totalPlayers: chelseaPlayers.length,
          players: insertedPlayers || []
        }
      });
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error('FPL Sync Simple API error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

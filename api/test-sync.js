import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('🔄 Starting test sync...');

    // Fetch FPL bootstrap data
    const fplResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    if (!fplResponse.ok) {
      throw new Error(`FPL API error: ${fplResponse.status}`);
    }
    
    const fplData = await fplResponse.json();
    console.log('✅ FPL data fetched successfully');

    // Find Chelsea team
    const teams = fplData.teams || [];
    const chelseaTeam = teams.find(team => 
      team.name.toLowerCase().includes('chelsea') || 
      team.short_name.toLowerCase().includes('che')
    );
    
    if (!chelseaTeam) {
      throw new Error('Chelsea team not found');
    }
    
    // Get Chelsea players
    const chelseaPlayers = fplData.elements.filter(player => player.team === chelseaTeam.id);
    console.log(`📊 Found ${chelseaPlayers.length} Chelsea players`);

    // Clear existing data
    const { error: deleteError } = await supabase
      .from('chelsea_players')
      .delete()
      .neq('id', 0);

    if (deleteError) {
      throw new Error(`Delete failed: ${deleteError.message}`);
    }

    // Insert with only existing columns
    const playersToInsert = chelseaPlayers.map(player => ({
      id: player.id,
      fpl_id: player.id,
      name: player.web_name || `${player.first_name} ${player.second_name}`,
      full_name: `${player.first_name} ${player.second_name}`,
      position: mapFPLPosition(player.element_type),
      price: (player.now_cost / 10).toFixed(1),
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
    const { data: insertedPlayers, error: insertError } = await supabase
      .from('chelsea_players')
      .insert(playersToInsert)
      .select();

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      throw new Error(`Insert failed: ${insertError.message}`);
    }

    console.log(`✅ Successfully inserted ${insertedPlayers?.length || 0} players`);

    return res.status(200).json({
      success: true,
      message: `Test sync completed - ${insertedPlayers?.length || 0} players synced`,
      data: {
        playersCreated: insertedPlayers?.length || 0,
        totalPlayers: chelseaPlayers.length,
        chelseaTeamId: chelseaTeam.id,
        chelseaTeamName: chelseaTeam.name
      }
    });

  } catch (error) {
    console.error('❌ Test sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Test sync failed',
      details: error.message
    });
  }
}

function mapFPLPosition(elementType) {
  const positionMap = {
    1: 'GK',
    2: 'DEF', 
    3: 'MID',
    4: 'FWD'
  };
  return positionMap[elementType] || 'MID';
}

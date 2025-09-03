import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Checking if Chelsea players sync is needed...');

    // Check when we last synced and how many players we have
    const { data: syncCheck } = await supabase
      .from('chelsea_players')
      .select('synced_at, id')
      .order('synced_at', { ascending: false });

    const now = new Date();
    const playerCount = syncCheck?.length || 0;
    const lastSync = syncCheck?.[0]?.synced_at ? new Date(syncCheck[0].synced_at) : null;
    const hoursSinceLastSync = lastSync ? (now - lastSync) / (1000 * 60 * 60) : 999;

    console.log(`📊 Current status: ${playerCount} players, last sync: ${hoursSinceLastSync.toFixed(1)}h ago`);

    // Determine if sync is needed
    const needsSync = (
      playerCount === 0 ||  // No players at all
      hoursSinceLastSync > 12 ||  // More than 12 hours since last sync
      (hoursSinceLastSync > 2 && playerCount < 20)  // Less than 20 players and over 2 hours
    );

    if (!needsSync) {
      console.log('✅ Sync not needed');
      return res.status(200).json({
        success: true,
        syncNeeded: false,
        message: 'Data is up to date',
        playerCount,
        lastSync: lastSync?.toISOString(),
        hoursSinceLastSync: hoursSinceLastSync.toFixed(1)
      });
    }

    console.log('🔄 Sync needed - fetching from FPL API...');

    // Fetch data from FPL API
    const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FPL-Smart-Sync/1.0)'
      }
    });

    if (!response.ok) {
      throw new Error(`FPL API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Get Chelsea players (team ID 7)
    const chelseaPlayers = data.elements.filter(player => player.team === 7);
    console.log(`📊 Found ${chelseaPlayers.length} Chelsea players from API`);

    // Get position types for mapping
    const positions = data.element_types.reduce((acc, pos) => {
      acc[pos.id] = pos.singular_name;
      return acc;
    }, {});

    // Transform players for database (essential fields only for performance)
    const transformedPlayers = chelseaPlayers.map(player => ({
      id: player.id,
      web_name: player.web_name,
      first_name: player.first_name,
      second_name: player.second_name,
      element_type: player.element_type,
      position_name: positions[player.element_type] || 'Unknown',
      team: player.team,
      team_name: 'Chelsea',
      now_cost: player.now_cost,
      total_points: player.total_points,
      event_points: player.event_points,
      form: player.form,
      selected_by_percent: player.selected_by_percent,
      minutes: player.minutes,
      goals_scored: player.goals_scored,
      assists: player.assists,
      status: player.status,
      news: player.news,
      chance_of_playing_this_round: player.chance_of_playing_this_round,
      chance_of_playing_next_round: player.chance_of_playing_next_round,
      synced_at: new Date().toISOString()
    }));

    console.log('🔄 Upserting players to database...');

    // Upsert players to database
    const { error: upsertError } = await supabase
      .from('chelsea_players')
      .upsert(transformedPlayers, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      });

    if (upsertError) {
      console.error('❌ Database upsert error:', upsertError);
      throw upsertError;
    }

    console.log('✅ Smart sync completed successfully');

    // Return success response
    res.status(200).json({
      success: true,
      syncNeeded: true,
      message: 'Smart sync completed successfully',
      playersCount: chelseaPlayers.length,
      syncedAt: new Date().toISOString(),
      previousPlayerCount: playerCount,
      hoursSinceLastSync: hoursSinceLastSync.toFixed(1)
    });

  } catch (error) {
    console.error('❌ Error in smart sync:', error);
    res.status(500).json({
      success: false,
      syncNeeded: false,
      error: 'Smart sync failed',
      details: error.message
    });
  }
}

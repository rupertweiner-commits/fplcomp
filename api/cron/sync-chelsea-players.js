import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Verify this is a cron request (for security)
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🕐 Starting scheduled Chelsea players sync...');

    // Check when we last synced
    const { data: lastSyncData } = await supabase
      .from('chelsea_players')
      .select('synced_at')
      .order('synced_at', { ascending: false })
      .limit(1)
      .single();

    const lastSync = lastSyncData?.synced_at ? new Date(lastSyncData.synced_at) : null;
    const now = new Date();
    const hoursSinceLastSync = lastSync ? (now - lastSync) / (1000 * 60 * 60) : 999;

    // Only sync if it's been more than 4 hours (to avoid rate limiting)
    if (hoursSinceLastSync < 4) {
      console.log(`⏭️ Skipping sync - last sync was ${hoursSinceLastSync.toFixed(1)} hours ago`);
      return res.status(200).json({
        success: true,
        message: 'Sync skipped - too recent',
        lastSync: lastSync?.toISOString(),
        hoursSinceLastSync: hoursSinceLastSync.toFixed(1)
      });
    }

    console.log('🔄 Fetching data from FPL API...');

    // Fetch data from FPL API
    const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FPL-Sync-Bot/1.0)'
      }
    });

    if (!response.ok) {
      throw new Error(`FPL API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Fetched FPL API data');

    // Get Chelsea players (team ID 7)
    const chelseaPlayers = data.elements.filter(player => player.team === 7);
    console.log(`📊 Found ${chelseaPlayers.length} Chelsea players`);

    // Get position types for mapping
    const positions = data.element_types.reduce((acc, pos) => {
      acc[pos.id] = pos.singular_name;
      return acc;
    }, {});

    // Transform players for database
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
      clean_sheets: player.clean_sheets,
      goals_conceded: player.goals_conceded,
      saves: player.saves,
      bonus: player.bonus,
      bps: player.bps,
      influence: player.influence,
      creativity: player.creativity,
      threat: player.threat,
      ict_index: player.ict_index,
      starts: player.starts,
      expected_goals: player.expected_goals,
      expected_assists: player.expected_assists,
      transfers_in: player.transfers_in,
      transfers_out: player.transfers_out,
      value_form: player.value_form,
      value_season: player.value_season,
      cost_change_start: player.cost_change_start,
      in_dreamteam: player.in_dreamteam,
      dreamteam_count: player.dreamteam_count,
      points_per_game: player.points_per_game,
      ep_this: player.ep_this,
      ep_next: player.ep_next,
      news: player.news,
      news_added: player.news_added ? new Date(player.news_added).toISOString() : null,
      chance_of_playing_this_round: player.chance_of_playing_this_round,
      chance_of_playing_next_round: player.chance_of_playing_next_round,
      status: player.status,
      photo: player.photo,
      code: player.code,
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

    console.log('✅ Scheduled Chelsea players sync completed successfully');

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Scheduled sync completed successfully',
      playersCount: chelseaPlayers.length,
      syncedAt: new Date().toISOString(),
      lastSync: lastSync?.toISOString(),
      hoursSinceLastSync: hoursSinceLastSync.toFixed(1)
    });

  } catch (error) {
    console.error('❌ Error in scheduled Chelsea players sync:', error);
    res.status(500).json({
      success: false,
      error: 'Scheduled sync failed',
      details: error.message
    });
  }
}



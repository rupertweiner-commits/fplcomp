import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔄 Starting Chelsea players sync from FPL API...');

    // Fetch data from FPL API
    const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
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
      expected_goals: player.expected_goals,
      expected_assists: player.expected_assists,
      expected_goal_involvements: player.expected_goal_involvements,
      expected_goals_conceded: player.expected_goals_conceded,
      transfers_in: player.transfers_in,
      transfers_out: player.transfers_out,
      transfers_in_event: player.transfers_in_event,
      transfers_out_event: player.transfers_out_event,
      value_form: player.value_form,
      value_season: player.value_season,
      cost_change_start: player.cost_change_start,
      cost_change_event: player.cost_change_event,
      in_dreamteam: player.in_dreamteam,
      dreamteam_count: player.dreamteam_count,
      points_per_game: player.points_per_game,
      ep_this: player.ep_this,
      ep_next: player.ep_next,
      special: player.special,
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
    const { data: upsertData, error: upsertError } = await supabase
      .from('chelsea_players')
      .upsert(transformedPlayers, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      });

    if (upsertError) {
      console.error('❌ Database upsert error:', upsertError);
      throw upsertError;
    }

    console.log('✅ Chelsea players sync completed successfully');

    // Return success response
    res.status(200).json({
      success: true,
      message: 'Chelsea players synced successfully',
      playersCount: chelseaPlayers.length,
      syncedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error syncing Chelsea players:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync Chelsea players',
      details: error.message
    });
  }
}



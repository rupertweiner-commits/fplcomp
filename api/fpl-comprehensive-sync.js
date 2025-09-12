const https = require('https');
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { trigger } = req.body; // 'daily', 'login', or 'manual'

  try {
    console.log(`🔄 Starting FPL comprehensive sync (trigger: ${trigger})`);

    // Check if we need to sync (avoid duplicate syncs)
    const shouldSync = await checkSyncNeeded(trigger);
    if (!shouldSync) {
      return res.status(200).json({
        success: true,
        message: 'Sync not needed - data is up to date',
        trigger
      });
    }

    // Fetch all FPL data
    const [playersData, fixturesData, teamsData] = await Promise.all([
      fetchFPLData('https://fantasy.premierleague.com/api/bootstrap-static/'),
      fetchFPLData('https://fantasy.premierleague.com/api/fixtures/'),
      fetchFPLData('https://fantasy.premierleague.com/api/teams/')
    ]);

    if (!playersData || !fixturesData) {
      throw new Error('Failed to fetch data from FPL API');
    }

    // Sync Chelsea players
    const chelseaPlayers = playersData.elements.filter(player => 
      teamsData.find(team => team.id === player.team)?.short_name === 'CHE'
    );

    const syncResults = {
      players: await syncChelseaPlayers(chelseaPlayers),
      fixtures: await syncChelseaFixtures(fixturesData),
      lastSync: new Date().toISOString()
    };

    // Log sync completion
    await logSyncCompletion(trigger, syncResults);

    console.log(`✅ FPL comprehensive sync completed (trigger: ${trigger})`);

    res.status(200).json({
      success: true,
      message: 'FPL data synced successfully',
      trigger,
      results: syncResults
    });

  } catch (error) {
    console.error('❌ FPL comprehensive sync failed:', error);
    
    // Log sync failure
    await logSyncFailure(trigger, error.message);

    res.status(500).json({
      success: false,
      error: 'Failed to sync FPL data',
      details: error.message,
      trigger
    });
  }
}

async function checkSyncNeeded(trigger) {
  try {
    // For daily sync, check if we've synced today
    if (trigger === 'daily') {
      const today = new Date().toISOString().split('T')[0];
      const { data: todaySync } = await supabase
        .from('fpl_sync_log')
        .select('*')
        .eq('sync_type', 'daily')
        .gte('created_at', `${today}T00:00:00.000Z`)
        .single();

      return !todaySync;
    }

    // For login trigger, allow sync (but we'll check frequency in the sync function)
    if (trigger === 'login') {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recentSync } = await supabase
        .from('fpl_sync_log')
        .select('*')
        .eq('sync_type', 'login')
        .gte('created_at', oneHourAgo)
        .single();

      return !recentSync;
    }

    // For manual sync, always allow
    return true;
  } catch (error) {
    console.error('Error checking sync need:', error);
    return true; // If we can't check, allow sync
  }
}

async function syncChelseaPlayers(chelseaPlayers) {
  console.log(`📊 Syncing ${chelseaPlayers.length} Chelsea players`);

  const results = {
    updated: 0,
    created: 0,
    errors: 0
  };

  for (const player of chelseaPlayers) {
    try {
      // Check if player exists
      const { data: existingPlayer } = await supabase
        .from('chelsea_players')
        .select('id')
        .eq('fpl_id', player.id)
        .single();

      const playerData = {
        fpl_id: player.id,
        name: `${player.first_name} ${player.second_name}`,
        first_name: player.first_name,
        second_name: player.second_name,
        web_name: player.web_name,
        position: getPositionFromElementType(player.element_type),
        position_name: getPositionNameFromElementType(player.element_type),
        price: player.now_cost / 10, // Convert from tenths
        total_points: player.total_points,
        form: player.form,
        points_per_game: player.points_per_game,
        selected_by_percent: player.selected_by_percent,
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
        expected_goal_involvements: player.expected_goal_involvements,
        expected_goals_conceded: player.expected_goals_conceded,
        yellow_cards: player.yellow_cards,
        red_cards: player.red_cards,
        penalties_saved: player.penalties_saved,
        penalties_missed: player.penalties_missed,
        minutes: player.minutes,
        is_available: player.status === 'a',
        availability_status: getAvailabilityStatus(player.status),
        availability_reason: player.news || null,
        chance_of_playing_this_round: player.chance_of_playing_this_round,
        chance_of_playing_next_round: player.chance_of_playing_next_round,
        news_added: player.news_added ? new Date(player.news_added).toISOString() : null,
        updated_at: new Date().toISOString()
      };

      if (existingPlayer) {
        // Update existing player
        const { error } = await supabase
          .from('chelsea_players')
          .update(playerData)
          .eq('fpl_id', player.id);

        if (error) throw error;
        results.updated++;
      } else {
        // Create new player
        const { error } = await supabase
          .from('chelsea_players')
          .insert(playerData);

        if (error) throw error;
        results.created++;
      }
    } catch (error) {
      console.error(`Error syncing player ${player.web_name}:`, error);
      results.errors++;
    }
  }

  console.log(`✅ Chelsea players sync complete: ${results.updated} updated, ${results.created} created, ${results.errors} errors`);
  return results;
}

async function syncChelseaFixtures(fixturesData) {
  console.log('📅 Syncing Chelsea fixtures');

  const chelseaFixtures = fixturesData.filter(fixture => 
    fixture.team_h === 4 || fixture.team_a === 4 // Chelsea team ID is 4
  );

  const results = {
    updated: 0,
    created: 0,
    errors: 0
  };

  for (const fixture of chelseaFixtures) {
    try {
      const fixtureData = {
        fpl_id: fixture.id,
        gameweek: fixture.event,
        home_team_id: fixture.team_h,
        away_team_id: fixture.team_a,
        is_home: fixture.team_h === 4,
        opponent_id: fixture.team_h === 4 ? fixture.team_a : fixture.team_h,
        kickoff_time: new Date(fixture.kickoff_time).toISOString(),
        finished: fixture.finished,
        started: fixture.started,
        home_score: fixture.team_h_score,
        away_score: fixture.team_a_score,
        home_difficulty: fixture.team_h_difficulty,
        away_difficulty: fixture.team_a_difficulty,
        updated_at: new Date().toISOString()
      };

      // Check if fixture exists
      const { data: existingFixture } = await supabase
        .from('chelsea_fixtures')
        .select('id')
        .eq('fpl_id', fixture.id)
        .single();

      if (existingFixture) {
        // Update existing fixture
        const { error } = await supabase
          .from('chelsea_fixtures')
          .update(fixtureData)
          .eq('fpl_id', fixture.id);

        if (error) throw error;
        results.updated++;
      } else {
        // Create new fixture
        const { error } = await supabase
          .from('chelsea_fixtures')
          .insert(fixtureData);

        if (error) throw error;
        results.created++;
      }
    } catch (error) {
      console.error(`Error syncing fixture ${fixture.id}:`, error);
      results.errors++;
    }
  }

  console.log(`✅ Chelsea fixtures sync complete: ${results.updated} updated, ${results.created} created, ${results.errors} errors`);
  return results;
}

async function logSyncCompletion(trigger, results) {
  try {
    await supabase
      .from('fpl_sync_log')
      .insert({
        sync_type: trigger,
        status: 'success',
        players_updated: results.players.updated,
        players_created: results.players.created,
        players_errors: results.players.errors,
        fixtures_updated: results.fixtures.updated,
        fixtures_created: results.fixtures.created,
        fixtures_errors: results.fixtures.errors,
        completed_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error logging sync completion:', error);
  }
}

async function logSyncFailure(trigger, errorMessage) {
  try {
    await supabase
      .from('fpl_sync_log')
      .insert({
        sync_type: trigger,
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error logging sync failure:', error);
  }
}

async function fetchFPLData(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

function getPositionFromElementType(elementType) {
  const positions = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };
  return positions[elementType] || 'UNKNOWN';
}

function getPositionNameFromElementType(elementType) {
  const positions = { 1: 'Goalkeeper', 2: 'Defender', 3: 'Midfielder', 4: 'Forward' };
  return positions[elementType] || 'Unknown';
}

function getAvailabilityStatus(status) {
  const statusMap = {
    'a': 'Available',
    'i': 'Injured',
    's': 'Suspended',
    'u': 'Unavailable'
  };
  return statusMap[status] || 'Unknown';
}

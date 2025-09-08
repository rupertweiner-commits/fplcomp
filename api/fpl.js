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
      case 'bootstrap':
        return await handleBootstrap(req, res);
      case 'current-gameweek':
        return await handleCurrentGameweek(req, res);
      case 'dashboard':
        return await handleDashboard(req, res);
      case 'manager':
        return await handleManager(req, res);
      case 'league':
        return await handleLeague(req, res);
      case 'gameweek-live':
        return await handleGameweekLive(req, res);
      case 'fixtures':
        return await handleFixtures(req, res);
      case 'top-performers':
        return await handleTopPerformers(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('FPL API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function handleBootstrap(req, res) {
  try {
    // Return basic bootstrap data
    const bootstrapData = {
      events: [
        {
          id: 1,
          name: "Gameweek 1",
          deadline_time: "2024-08-16T18:30:00Z",
          finished: false,
          is_current: true
        }
      ],
      teams: [
        { id: 1, name: "Arsenal", short_name: "ARS" },
        { id: 2, name: "Chelsea", short_name: "CHE" },
        { id: 3, name: "Liverpool", short_name: "LIV" },
        { id: 4, name: "Manchester City", short_name: "MCI" },
        { id: 5, name: "Manchester United", short_name: "MUN" }
      ],
      elements: [
        {
          id: 1,
          first_name: "Mohamed",
          second_name: "Salah",
          web_name: "Salah",
          element_type: 3, // Midfielder
          team: 3, // Liverpool
          now_cost: 130, // £13.0M
          total_points: 0,
          selected_by_percent: "45.2"
        },
        {
          id: 2,
          first_name: "Erling",
          second_name: "Haaland",
          web_name: "Haaland",
          element_type: 4, // Forward
          team: 4, // Manchester City
          now_cost: 140, // £14.0M
          total_points: 0,
          selected_by_percent: "52.1"
        }
      ],
      element_types: [
        { id: 1, singular_name: "Goalkeeper", plural_name: "Goalkeepers" },
        { id: 2, singular_name: "Defender", plural_name: "Defenders" },
        { id: 3, singular_name: "Midfielder", plural_name: "Midfielders" },
        { id: 4, singular_name: "Forward", plural_name: "Forwards" }
      ]
    };

    res.status(200).json({
      success: true,
      data: bootstrapData
    });

  } catch (error) {
    throw error;
  }
}

async function handleCurrentGameweek(req, res) {
  try {
    const currentGameweek = {
      id: 1,
      name: "Gameweek 1",
      deadline_time: "2024-08-16T18:30:00Z",
      finished: false,
      is_current: true
    };

    res.status(200).json({
      success: true,
      data: currentGameweek
    });

  } catch (error) {
    throw error;
  }
}

async function handleDashboard(req, res) {
  try {
    const dashboardData = {
      current_gameweek: 1,
      total_managers: 4,
      total_players: 2,
      recent_activity: [
        {
          id: 1,
          type: "player_allocated",
          player_name: "Mohamed Salah",
          user_name: "Rupert",
          timestamp: new Date().toISOString()
        }
      ],
      top_performers: [
        {
          id: 1,
          name: "Mohamed Salah",
          points: 15,
          team: "Liverpool"
        }
      ]
    };

    res.status(200).json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    throw error;
  }
}

async function handleManager(req, res) {
  try {
    const { managerId } = req.query;
    const { gameweek } = req.query;

    if (!managerId) {
      return res.status(400).json({ error: 'Manager ID required' });
    }

    // Get manager data from database
    const { data: manager, error: managerError } = await supabase
      .from('users')
      .select('*')
      .eq('id', managerId)
      .single();

    if (managerError || !manager) {
      return res.status(404).json({ error: 'Manager not found' });
    }

    // Get manager's team
    const { data: team, error: teamError } = await supabase
      .from('user_teams')
      .select(`
        *,
        player_ownerships (
          *,
          players (*)
        )
      `)
      .eq('user_id', managerId)
      .eq('gameweek', gameweek || 1)
      .single();

    const managerData = {
      id: manager.id,
      name: manager.first_name + ' ' + manager.last_name,
      team_name: manager.team_name || 'My Team',
      total_points: team?.total_points || 0,
      overall_rank: team?.overall_rank || 0,
      team: team?.player_ownerships || []
    };

    res.status(200).json({
      success: true,
      data: managerData
    });

  } catch (error) {
    throw error;
  }
}

async function handleLeague(req, res) {
  try {
    const { id } = req.query;
    const { page = 1 } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'League ID required' });
    }

    // Get league standings from database
    const { data: standings, error } = await supabase
      .from('user_teams')
      .select(`
        *,
        users (
          first_name,
          last_name,
          team_name
        )
      `)
      .eq('gameweek', 1)
      .order('total_points', { ascending: false })
      .range((page - 1) * 20, page * 20 - 1);

    if (error) {
      throw error;
    }

    const leagueData = {
      id: id,
      name: "FPL League",
      standings: standings.map((standing, index) => ({
        rank: index + 1,
        manager_name: standing.users.first_name + ' ' + standing.users.last_name,
        team_name: standing.users.team_name,
        total_points: standing.total_points,
        gameweek_points: standing.gameweek_points || 0
      }))
    };

    res.status(200).json({
      success: true,
      data: leagueData
    });

  } catch (error) {
    throw error;
  }
}

async function handleGameweekLive(req, res) {
  try {
    const { gameweek } = req.query;

    const liveData = {
      gameweek: gameweek || 1,
      fixtures: [
        {
          id: 1,
          home_team: "Arsenal",
          away_team: "Chelsea",
          home_score: 2,
          away_score: 1,
          finished: true
        }
      ],
      live_events: []
    };

    res.status(200).json({
      success: true,
      data: liveData
    });

  } catch (error) {
    throw error;
  }
}

async function handleFixtures(req, res) {
  try {
    const { event } = req.query;

    const fixtures = [
      {
        id: 1,
        event: event || 1,
        home_team: "Arsenal",
        away_team: "Chelsea",
        home_score: 2,
        away_score: 1,
        finished: true,
        kickoff_time: "2024-08-16T15:00:00Z"
      }
    ];

    res.status(200).json({
      success: true,
      data: fixtures
    });

  } catch (error) {
    throw error;
  }
}

async function handleTopPerformers(req, res) {
  try {
    const { gameweek, limit = 10 } = req.query;

    const topPerformers = [
      {
        id: 1,
        name: "Mohamed Salah",
        team: "Liverpool",
        position: "Midfielder",
        points: 15,
        price: 13.0
      },
      {
        id: 2,
        name: "Erling Haaland",
        team: "Manchester City",
        position: "Forward",
        points: 12,
        price: 14.0
      }
    ].slice(0, parseInt(limit));

    res.status(200).json({
      success: true,
      data: topPerformers
    });

  } catch (error) {
    throw error;
  }
}

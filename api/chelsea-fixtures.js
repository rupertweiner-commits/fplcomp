const https = require('https');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch fixtures from FPL API
    const fixturesData = await fetchFPLData('https://fantasy.premierleague.com/api/fixtures/');
    
    if (!fixturesData) {
      throw new Error('Failed to fetch fixtures from FPL API');
    }

    // Filter for Chelsea fixtures (team_id: 4 for Chelsea)
    const chelseaFixtures = fixturesData
      .filter(fixture => fixture.team_h === 4 || fixture.team_a === 4)
      .map(fixture => ({
        id: fixture.id,
        gameweek: fixture.event,
        home_team: fixture.team_h === 4 ? 'Chelsea' : getTeamName(fixture.team_h),
        away_team: fixture.team_a === 4 ? 'Chelsea' : getTeamName(fixture.team_a),
        is_home: fixture.team_h === 4,
        opponent: fixture.team_h === 4 ? getTeamName(fixture.team_a) : getTeamName(fixture.team_h),
        venue: fixture.team_h === 4 ? 'Stamford Bridge' : getTeamVenue(fixture.team_a),
        kickoff_time: fixture.kickoff_time,
        finished: fixture.finished,
        started: fixture.started,
        home_score: fixture.team_h_score,
        away_score: fixture.team_a_score,
        difficulty: fixture.team_h === 4 ? fixture.team_h_difficulty : fixture.team_a_difficulty
      }))
      .sort((a, b) => new Date(a.kickoff_time) - new Date(b.kickoff_time));

    // Find next game (first unfinished fixture)
    const nextGame = chelseaFixtures.find(fixture => !fixture.finished && !fixture.started);
    
    // Find current gameweek
    const currentGameweek = nextGame ? nextGame.gameweek : chelseaFixtures[chelseaFixtures.length - 1]?.gameweek || 1;

    // Calculate deadline (2 hours before kickoff)
    let deadline = null;
    if (nextGame) {
      const kickoffTime = new Date(nextGame.kickoff_time);
      deadline = new Date(kickoffTime.getTime() - (2 * 60 * 60 * 1000)); // 2 hours before
    }

    res.status(200).json({
      success: true,
      data: {
        nextGame,
        currentGameweek,
        deadline,
        allFixtures: chelseaFixtures,
        canMakeChanges: deadline ? new Date() < deadline : true
      }
    });

  } catch (error) {
    console.error('Error fetching Chelsea fixtures:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch Chelsea fixtures',
      details: error.message 
    });
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

function getTeamName(teamId) {
  const teams = {
    1: 'Arsenal',
    2: 'Aston Villa', 
    3: 'Bournemouth',
    4: 'Chelsea',
    5: 'Crystal Palace',
    6: 'Everton',
    7: 'Fulham',
    8: 'Liverpool',
    9: 'Luton',
    10: 'Manchester City',
    11: 'Manchester United',
    12: 'Newcastle United',
    13: 'Nottingham Forest',
    14: 'Sheffield United',
    15: 'Tottenham',
    16: 'West Ham United',
    17: 'Wolves',
    18: 'Brighton & Hove Albion',
    19: 'Burnley',
    20: 'Brentford'
  };
  return teams[teamId] || 'Unknown Team';
}

function getTeamVenue(teamId) {
  const venues = {
    1: 'Emirates Stadium',
    2: 'Villa Park',
    3: 'Vitality Stadium',
    4: 'Stamford Bridge',
    5: 'Selhurst Park',
    6: 'Goodison Park',
    7: 'Craven Cottage',
    8: 'Anfield',
    9: 'Kenilworth Road',
    10: 'Etihad Stadium',
    11: 'Old Trafford',
    12: 'St. James\' Park',
    13: 'City Ground',
    14: 'Bramall Lane',
    15: 'Tottenham Hotspur Stadium',
    16: 'London Stadium',
    17: 'Molineux Stadium',
    18: 'Amex Stadium',
    19: 'Turf Moor',
    20: 'Brentford Community Stadium'
  };
  return venues[teamId] || 'Unknown Venue';
}

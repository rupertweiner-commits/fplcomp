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

    // Filter for Chelsea fixtures (team_id: 7 for Chelsea)
    const chelseaFixtures = fixturesData
      .filter(fixture => fixture.team_h === 7 || fixture.team_a === 7)
      .map(fixture => ({
        id: fixture.id,
        gameweek: fixture.event,
        home_team: fixture.team_h === 7 ? 'Chelsea' : getTeamName(fixture.team_h),
        away_team: fixture.team_a === 7 ? 'Chelsea' : getTeamName(fixture.team_a),
        is_home: fixture.team_h === 7,
        opponent: fixture.team_h === 7 ? getTeamName(fixture.team_a) : getTeamName(fixture.team_h),
        venue: fixture.team_h === 7 ? 'Stamford Bridge' : getTeamVenue(fixture.team_a),
        kickoff_time: fixture.kickoff_time,
        finished: fixture.finished,
        started: fixture.started,
        home_score: fixture.team_h_score,
        away_score: fixture.team_a_score,
        difficulty: fixture.team_h === 7 ? fixture.team_h_difficulty : fixture.team_a_difficulty
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
    3: 'Burnley',
    4: 'Bournemouth',
    5: 'Brentford',
    6: 'Brighton & Hove Albion',
    7: 'Chelsea',
    8: 'Crystal Palace',
    9: 'Everton',
    10: 'Fulham',
    11: 'Liverpool',
    12: 'Luton',
    13: 'Manchester City',
    14: 'Manchester United',
    15: 'Newcastle United',
    16: 'Nottingham Forest',
    17: 'Sheffield United',
    18: 'Spurs',
    19: 'West Ham United',
    20: 'Wolves'
  };
  return teams[teamId] || 'Unknown Team';
}

function getTeamVenue(teamId) {
  const venues = {
    1: 'Emirates Stadium',
    2: 'Villa Park',
    3: 'Turf Moor',
    4: 'Vitality Stadium',
    5: 'Brentford Community Stadium',
    6: 'Amex Stadium',
    7: 'Stamford Bridge',
    8: 'Selhurst Park',
    9: 'Goodison Park',
    10: 'Craven Cottage',
    11: 'Anfield',
    12: 'Kenilworth Road',
    13: 'Etihad Stadium',
    14: 'Old Trafford',
    15: 'St. James\' Park',
    16: 'City Ground',
    17: 'Bramall Lane',
    18: 'Tottenham Hotspur Stadium',
    19: 'London Stadium',
    20: 'Molineux Stadium'
  };
  return venues[teamId] || 'Unknown Venue';
}

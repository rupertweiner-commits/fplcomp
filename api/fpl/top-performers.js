// Vercel API route for FPL top performers
// GET /api/fpl/top-performers?gameweek=1&limit=10

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { gameweek, limit = 10 } = req.query;
    
    if (!gameweek) {
      return res.status(400).json({ error: 'Gameweek parameter is required' });
    }

    // Fetch live data for the gameweek
    const response = await fetch(`https://fantasy.premierleague.com/api/event/${gameweek}/live/`);
    
    if (!response.ok) {
      throw new Error(`FPL API responded with status: ${response.status}`);
    }

    const liveData = await response.json();
    
    // Extract top performers from live data
    const topPerformers = liveData.elements
      .map(element => ({
        id: element.id,
        name: element.stats?.name || 'Unknown',
        team: element.stats?.team || 'Unknown',
        position: element.stats?.position || 'Unknown',
        total_points: element.stats?.total_points || 0,
        gameweek_points: element.stats?.event_points || 0,
        minutes: element.stats?.minutes || 0,
        goals_scored: element.stats?.goals_scored || 0,
        assists: element.stats?.assists || 0,
        clean_sheets: element.stats?.clean_sheets || 0,
        saves: element.stats?.saves || 0,
        bonus: element.stats?.bonus || 0
      }))
      .sort((a, b) => b.gameweek_points - a.gameweek_points)
      .slice(0, parseInt(limit));
    
    // Cache for 5 minutes
    res.setHeader('Cache-Control', 'public, max-age=300');
    
    return res.status(200).json({
      success: true,
      data: topPerformers,
      gameweek: parseInt(gameweek),
      limit: parseInt(limit),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching FPL top performers:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch top performers data',
      details: error.message
    });
  }
}

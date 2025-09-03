// Vercel API route for FPL gameweek live data
// GET /api/fpl/gameweek-live?gameweek=1

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { gameweek } = req.query;
    
    if (!gameweek) {
      return res.status(400).json({ error: 'Gameweek parameter is required' });
    }

    // Fetch live data from FPL API
    const response = await fetch(`https://fantasy.premierleague.com/api/event/${gameweek}/live/`);
    
    if (!response.ok) {
      throw new Error(`FPL API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Cache for 5 minutes
    res.setHeader('Cache-Control', 'public, max-age=300');
    
    return res.status(200).json({
      success: true,
      data: data,
      gameweek: parseInt(gameweek),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching FPL gameweek live data:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch live gameweek data',
      details: error.message
    });
  }
}

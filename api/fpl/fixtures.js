// Vercel API route for FPL fixtures
// GET /api/fpl/fixtures?event=1

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { event } = req.query;
    
    // Build URL with optional event parameter
    let url = 'https://fantasy.premierleague.com/api/fixtures/';
    if (event) {
      url += `?event=${event}`;
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`FPL API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Cache for 1 hour (fixtures don't change often)
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    return res.status(200).json({
      success: true,
      data: data,
      event: event ? parseInt(event) : null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching FPL fixtures:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch fixtures data',
      details: error.message
    });
  }
}

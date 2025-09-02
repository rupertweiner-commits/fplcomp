// Vercel API route to proxy FPL API calls
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch data from FPL API
    const response = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    
    if (!response.ok) {
      throw new Error(`FPL API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    // Return the data with proper headers
    res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('FPL API proxy error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch FPL data',
      message: error.message 
    });
  }
}

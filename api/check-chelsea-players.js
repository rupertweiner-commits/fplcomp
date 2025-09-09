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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Checking Chelsea players in Supabase...');
    
    // Get all Chelsea players from database
    const { data: players, error } = await supabase
      .from('chelsea_players')
      .select('*')
      .order('name');

    if (error) {
      console.error('❌ Error fetching Chelsea players:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch Chelsea players',
        details: error.message 
      });
    }

    console.log(`✅ Found ${players?.length || 0} Chelsea players in Supabase`);
    
    // Group by position for better analysis
    const playersByPosition = players?.reduce((acc, player) => {
      const position = player.position || 'UNK';
      if (!acc[position]) acc[position] = [];
      acc[position].push(player);
      return acc;
    }, {}) || {};

    // Get position counts
    const positionCounts = Object.entries(playersByPosition).map(([position, players]) => ({
      position,
      count: players.length,
      players: players.map(p => ({ name: p.name, fpl_id: p.fpl_id, price: p.price }))
    }));

    res.status(200).json({
      success: true,
      data: {
        totalPlayers: players?.length || 0,
        players: players || [],
        positionCounts,
        lastUpdated: players?.[0]?.updated_at || 'Unknown'
      }
    });

  } catch (error) {
    console.error('❌ Check Chelsea players error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

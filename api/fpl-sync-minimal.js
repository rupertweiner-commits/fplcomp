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

    // Simple test action
    if (action === 'test') {
      return res.status(200).json({ 
        success: true, 
        message: 'FPL Sync Minimal API is working',
        timestamp: new Date().toISOString(),
        environment: {
          hasSupabaseUrl: !!process.env.SUPABASE_URL,
          hasSupabaseKey: !!process.env.SUPABASE_ANON_KEY
        }
      });
    }

    // Simple sync status
    if (action === 'sync-status') {
      const { data: status, error } = await supabase
        .from('fpl_sync_log')
        .select('*')
        .order('sync_started_at', { ascending: false })
        .limit(1)
        .single();

      return res.status(200).json({
        success: true,
        data: status || null,
        error: error?.message || null
      });
    }

    // Simple sync action (just test database connection)
    if (action === 'sync-chelsea-players') {
      if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }

      // Test database connection
      const { data: players, error } = await supabase
        .from('chelsea_players')
        .select('count(*)')
        .limit(1);

      if (error) {
        return res.status(500).json({
          success: false,
          error: 'Database connection failed',
          details: error.message
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Database connection successful',
        data: { playerCount: players?.[0]?.count || 0 }
      });
    }

    return res.status(400).json({ error: 'Invalid action' });

  } catch (error) {
    console.error('FPL Sync Minimal API error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

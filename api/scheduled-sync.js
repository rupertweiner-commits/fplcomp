import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Verify this is a scheduled request (from Vercel Cron or similar)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🕐 Starting scheduled daily FPL sync');

    // Call the comprehensive sync API
    const syncResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/fpl-comprehensive-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trigger: 'daily' })
    });

    const syncResult = await syncResponse.json();

    if (!syncResult.success) {
      throw new Error(syncResult.error || 'Sync failed');
    }

    console.log('✅ Scheduled daily sync completed successfully');

    res.status(200).json({
      success: true,
      message: 'Daily FPL sync completed successfully',
      timestamp: new Date().toISOString(),
      results: syncResult.results
    });

  } catch (error) {
    console.error('❌ Scheduled daily sync failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Scheduled sync failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

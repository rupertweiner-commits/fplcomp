// Simple daily sync trigger - can be called by external cron services
// This endpoint can be called by services like cron-job.org or similar

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🕐 Daily sync trigger called');

    // Call the existing FPL sync API
    const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/fpl-sync?action=daily-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Daily sync failed');
    }

    console.log('✅ Daily sync trigger completed successfully');

    res.status(200).json({
      success: true,
      message: 'Daily sync triggered successfully',
      timestamp: new Date().toISOString(),
      result: result
    });

  } catch (error) {
    console.error('❌ Daily sync trigger failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Daily sync trigger failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

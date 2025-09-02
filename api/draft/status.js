import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // For now, return mock draft status data
    // Later we'll integrate with actual draft database
    const draftStatus = {
      isDraftActive: false,
      currentTurn: 1,
      totalTurns: 4,
      currentUser: null,
      draftOrder: [1, 2, 3, 4],
      isComplete: false,
      currentGameweek: 1,
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      data: draftStatus
    });

  } catch (error) {
    console.error('Draft status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch draft status'
    });
  }
}




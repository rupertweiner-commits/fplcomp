import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all users with their total points
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select(`
        id,
        first_name,
        last_name,
        email,
        total_points
      `)
      .order('total_points', { ascending: false });

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }

    // Add position to each user
    const leaderboard = users.map((user, index) => ({
      ...user,
      position: index + 1,
      total_points: user.total_points || 0
    }));

    res.status(200).json({
      success: true,
      users: leaderboard
    });

  } catch (error) {
    console.error('Error in leaderboard API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

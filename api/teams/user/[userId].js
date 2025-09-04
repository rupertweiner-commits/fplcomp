import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;

  try {
    const { data: team, error } = await supabase
      .from('user_teams')
      .select('*')
      .eq('user_id', userId)
      .eq('gameweek', 1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    if (!team) {
      return res.status(404).json({ error: 'No team found for this user' });
    }

    res.status(200).json({ team });

  } catch (error) {
    console.error('Failed to fetch user team:', error);
    res.status(500).json({ 
      error: 'Failed to fetch user team',
      details: error.message 
    });
  }
}

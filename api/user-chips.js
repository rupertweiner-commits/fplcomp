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

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // Get user's chips using the database function
    const { data, error } = await supabase
      .rpc('get_user_chips', { user_uuid: userId });

    if (error) {
      console.error('Error fetching user chips:', error);
      return res.status(500).json({ error: 'Failed to fetch user chips' });
    }

    res.status(200).json({
      success: true,
      chips: data || []
    });

  } catch (error) {
    console.error('Error in user-chips API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

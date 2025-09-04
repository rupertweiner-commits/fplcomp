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
    const { data: teams, error } = await supabase
      .from('user_teams')
      .select(`
        *,
        users!inner(id, email, first_name, last_name)
      `)
      .eq('gameweek', 1);

    if (error) {
      throw error;
    }

    const formattedTeams = teams.map(team => ({
      user: {
        id: team.users.id,
        email: team.users.email,
        name: `${team.users.first_name} ${team.users.last_name}`.trim()
      },
      team: team.players,
      totalValue: team.total_value
    }));

    res.status(200).json({ teams: formattedTeams });

  } catch (error) {
    console.error('Failed to fetch all teams:', error);
    res.status(500).json({ 
      error: 'Failed to fetch all teams',
      details: error.message 
    });
  }
}

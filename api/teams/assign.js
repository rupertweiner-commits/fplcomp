import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get all active users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('is_active', true);

    if (usersError) {
      throw usersError;
    }

    if (users.length !== 4) {
      return res.status(400).json({ 
        error: `Expected 4 users, found ${users.length}. Please ensure all 4 users are active.` 
      });
    }

    // Get all available Chelsea players
    const { data: players, error: playersError } = await supabase
      .from('chelsea_players')
      .select('*')
      .eq('is_available', true);

    if (playersError) {
      throw playersError;
    }

    if (players.length < 20) { // Need at least 20 players for 4 teams of 5
      return res.status(400).json({ 
        error: `Not enough available players. Need at least 20, found ${players.length}` 
      });
    }

    // Separate players by position
    const defenders = players.filter(p => p.position === 'GK' || p.position === 'DEF');
    const attackers = players.filter(p => p.position === 'MID' || p.position === 'FWD');

    if (defenders.length < 8 || attackers.length < 12) {
      return res.status(400).json({ 
        error: `Not enough players by position. Need at least 8 defenders and 12 attackers.` 
      });
    }

    // Shuffle arrays
    const shuffle = (array) => array.sort(() => Math.random() - 0.5);
    const shuffledDefenders = shuffle([...defenders]);
    const shuffledAttackers = shuffle([...attackers]);

    // Assign teams to users
    const teamAssignments = [];
    const usedPlayerIds = new Set();

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      
      // Assign 2 defenders (1 GK + 1 DEF, or 2 DEF)
      const userDefenders = [];
      for (let j = 0; j < 2 && userDefenders.length < 2; j++) {
        const defender = shuffledDefenders.find(p => !usedPlayerIds.has(p.id));
        if (defender) {
          userDefenders.push(defender);
          usedPlayerIds.add(defender.id);
        }
      }

      // Assign 3 attackers
      const userAttackers = [];
      for (let j = 0; j < 3 && userAttackers.length < 3; j++) {
        const attacker = shuffledAttackers.find(p => !usedPlayerIds.has(p.id));
        if (attacker) {
          userAttackers.push(attacker);
          usedPlayerIds.add(attacker.id);
        }
      }

      const userTeam = [...userDefenders, ...userAttackers];

      // Save team to database
      const { error: teamError } = await supabase
        .from('user_teams')
        .upsert({
          user_id: user.id,
          gameweek: 1,
          players: userTeam.map(p => ({
            id: p.id,
            name: p.name,
            position: p.position,
            price: p.price
          })),
          total_value: userTeam.reduce((sum, p) => sum + p.price, 0),
          updated_at: new Date().toISOString()
        });

      if (teamError) {
        throw teamError;
      }

      teamAssignments.push({
        user: {
          id: user.id,
          email: user.email,
          name: `${user.first_name} ${user.last_name}`.trim()
        },
        team: userTeam.map(p => ({
          id: p.id,
          name: p.name,
          position: p.position,
          price: p.price
        })),
        totalValue: userTeam.reduce((sum, p) => sum + p.price, 0)
      });
    }

    res.status(200).json({
      success: true,
      message: 'Teams assigned successfully!',
      teams: teamAssignments
    });

  } catch (error) {
    console.error('Team assignment error:', error);
    res.status(500).json({ 
      error: 'Failed to assign teams',
      details: error.message 
    });
  }
}

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
    const { userId, playerOutId, playerInId, gameweek } = req.body;

    if (!userId || !playerOutId || !playerInId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user is authenticated
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user || user.id !== userId) {
      return res.status(401).json({ error: 'Invalid token or user mismatch' });
    }

    // Get user's current team
    const { data: currentTeam, error: teamError } = await supabase
      .from('user_teams')
      .select('*')
      .eq('user_id', userId)
      .eq('gameweek', gameweek || 1)
      .single();

    if (teamError) {
      throw teamError;
    }

    if (!currentTeam) {
      return res.status(404).json({ error: 'No team found for this user' });
    }

    // Check if playerOutId is in the team
    const playerOut = currentTeam.players.find(p => p.id === playerOutId);
    if (!playerOut) {
      return res.status(400).json({ error: 'Player to remove not found in team' });
    }

    // Get available players (not in any team)
    const { data: allTeams, error: teamsError } = await supabase
      .from('user_teams')
      .select('players')
      .eq('gameweek', gameweek || 1);

    if (teamsError) {
      throw teamsError;
    }

    const usedPlayerIds = new Set();
    allTeams.forEach(team => {
      team.players.forEach(player => {
        if (player.id !== playerOutId) { // Allow swapping with the player being removed
          usedPlayerIds.add(player.id);
        }
      });
    });

    // Get all Chelsea players
    const { data: allPlayers, error: playersError } = await supabase
      .from('chelsea_players')
      .select('*')
      .eq('is_available', true);

    if (playersError) {
      throw playersError;
    }

    // Find the player to add
    const playerIn = allPlayers.find(p => p.id === playerInId && !usedPlayerIds.has(p.id));
    if (!playerIn) {
      return res.status(400).json({ error: 'Player not available for transfer' });
    }

    // Update team with new player
    const updatedPlayers = currentTeam.players.map(player => 
      player.id === playerOutId 
        ? {
            id: playerIn.id,
            name: playerIn.name,
            position: playerIn.position,
            price: playerIn.price
          }
        : player
    );

    const newTotalValue = updatedPlayers.reduce((sum, p) => sum + p.price, 0);

    // Update team in database
    const { error: updateError } = await supabase
      .from('user_teams')
      .update({
        players: updatedPlayers,
        total_value: newTotalValue,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('gameweek', gameweek || 1);

    if (updateError) {
      throw updateError;
    }

    res.status(200).json({
      success: true,
      message: 'Transfer completed successfully',
      data: {
        playerOut: playerOut,
        playerIn: {
          id: playerIn.id,
          name: playerIn.name,
          position: playerIn.position,
          price: playerIn.price
        },
        newTotalValue
      }
    });

  } catch (error) {
    console.error('Failed to process transfer:', error);
    res.status(500).json({ 
      error: 'Failed to process transfer',
      details: error.message 
    });
  }
}

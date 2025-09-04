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
    const { userId, activePlayers, benchedPlayer, captain, gameweek } = req.body;

    if (!userId || !activePlayers || !Array.isArray(activePlayers)) {
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

    if (teamError && teamError.code !== 'PGRST116') {
      throw teamError;
    }

    // Update team lineup
    const teamData = {
      user_id: userId,
      gameweek: gameweek || 1,
      active_players: activePlayers,
      benched_player: benchedPlayer,
      captain: captain,
      updated_at: new Date().toISOString()
    };

    if (currentTeam) {
      // Update existing team
      const { error: updateError } = await supabase
        .from('user_teams')
        .update(teamData)
        .eq('user_id', userId)
        .eq('gameweek', gameweek || 1);

      if (updateError) {
        throw updateError;
      }
    } else {
      // Create new team record
      const { error: insertError } = await supabase
        .from('user_teams')
        .insert(teamData);

      if (insertError) {
        throw insertError;
      }
    }

    res.status(200).json({
      success: true,
      message: 'Team saved successfully'
    });

  } catch (error) {
    console.error('Failed to save team:', error);
    res.status(500).json({ 
      error: 'Failed to save team',
      details: error.message 
    });
  }
}

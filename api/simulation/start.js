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
    // Check if user is admin
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Check if teams are assigned
    const { data: teams, error: teamsError } = await supabase
      .from('user_teams')
      .select('user_id')
      .eq('gameweek', 1);

    if (teamsError) {
      throw teamsError;
    }

    if (teams.length < 4) {
      return res.status(400).json({ 
        error: 'Cannot start simulation - teams must be assigned to all 4 users first' 
      });
    }

    // Enable simulation mode
    const { data: updatedStatus, error: updateError } = await supabase
      .from('simulation_status')
      .upsert({
        current_gameweek: 1,
        is_simulation_mode: true,
        is_draft_complete: true,
        total_gameweeks: 38,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    res.status(200).json({
      success: true,
      message: 'Simulation mode enabled successfully',
      data: updatedStatus
    });

  } catch (error) {
    console.error('Failed to start simulation:', error);
    res.status(500).json({ 
      error: 'Failed to start simulation',
      details: error.message 
    });
  }
}

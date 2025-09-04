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
    const { userId, chipId, chipName, targetUserId, gameweek } = req.body;

    if (!userId || !chipId || !chipName) {
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

    // Check if chip exists and is available
    const { data: chip, error: chipError } = await supabase
      .from('user_chips')
      .select('*')
      .eq('id', chipId)
      .eq('user_id', userId)
      .eq('is_used', false)
      .single();

    if (chipError || !chip) {
      return res.status(404).json({ error: 'Chip not found or already used' });
    }

    // Check if chip is valid for current gameweek
    const currentGameweek = gameweek || 1;
    if (currentGameweek < chip.received_gameweek || currentGameweek > chip.expires_gameweek) {
      return res.status(400).json({ error: 'Chip is not valid for this gameweek' });
    }

    // For chips that require targets, validate target user
    if (['Point Vampire', 'Captain Chaos', 'Transfer Hijack', 'Injury Report'].includes(chipName)) {
      if (!targetUserId) {
        return res.status(400).json({ error: 'Target user required for this chip' });
      }

      // Check if target user exists
      const { data: targetUser, error: targetError } = await supabase
        .from('users')
        .select('id')
        .eq('id', targetUserId)
        .eq('is_active', true)
        .single();

      if (targetError || !targetUser) {
        return res.status(404).json({ error: 'Target user not found' });
      }
    }

    // Mark chip as used
    const { error: updateError } = await supabase
      .from('user_chips')
      .update({
        is_used: true,
        used_gameweek: currentGameweek,
        used_at: new Date().toISOString()
      })
      .eq('id', chipId);

    if (updateError) {
      throw updateError;
    }

    // Create chip usage record
    const { error: usageError } = await supabase
      .from('chip_usage')
      .insert({
        user_id: userId,
        chip_id: chipId,
        chip_name: chipName,
        target_user_id: targetUserId,
        gameweek: currentGameweek,
        used_at: new Date().toISOString()
      });

    if (usageError) {
      throw usageError;
    }

    res.status(200).json({
      success: true,
      message: `Chip "${chipName}" used successfully`,
      data: {
        chipId,
        chipName,
        targetUserId,
        gameweek: currentGameweek
      }
    });

  } catch (error) {
    console.error('Failed to use chip:', error);
    res.status(500).json({ 
      error: 'Failed to use chip',
      details: error.message 
    });
  }
}

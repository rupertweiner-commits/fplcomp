import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, chipType, targetUserId, gameweek } = req.body;

  if (!userId || !chipType || !gameweek) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Check if user can use the chip
    const { data: canUse, error: canUseError } = await supabase
      .rpc('can_use_chip', { 
        user_uuid: userId, 
        chip_type: chipType, 
        target_uuid: targetUserId 
      });

    if (canUseError) {
      console.error('Error checking chip usage:', canUseError);
      return res.status(500).json({ error: 'Failed to check chip usage' });
    }

    if (!canUse) {
      return res.status(400).json({ error: 'Cannot use this chip at this time' });
    }

    // Get chip definition
    const { data: chipDef, error: chipDefError } = await supabase
      .from('chip_definitions')
      .select('*')
      .eq('name', chipType)
      .single();

    if (chipDefError || !chipDef) {
      return res.status(400).json({ error: 'Chip not found' });
    }

    // Use the chip based on type
    let effectData = {};
    let message = '';

    switch (chipType) {
      case 'Player Swap':
        if (!targetUserId) {
          return res.status(400).json({ error: 'Target user required for Player Swap' });
        }
        effectData = { target_user_id: targetUserId, effect_type: 'swap' };
        message = 'Player swap effect applied';
        break;

      case 'Bench Banish':
        if (!targetUserId) {
          return res.status(400).json({ error: 'Target user required for Bench Banish' });
        }
        effectData = { target_user_id: targetUserId, effect_type: 'banish' };
        message = 'Bench banish effect applied';
        break;

      case 'Shield':
        effectData = { effect_type: 'shield' };
        message = 'Shield activated - you are protected from chip effects';
        break;

      case 'Captain Curse':
        if (!targetUserId) {
          return res.status(400).json({ error: 'Target user required for Captain Curse' });
        }
        effectData = { target_user_id: targetUserId, effect_type: 'curse' };
        message = 'Captain curse effect applied';
        break;

      case 'Triple Captain':
        effectData = { effect_type: 'triple_captain' };
        message = 'Triple captain activated for next gameweek';
        break;

      case 'Bench Boost':
        effectData = { effect_type: 'bench_boost' };
        message = 'Bench boost activated for next gameweek';
        break;

      default:
        return res.status(400).json({ error: 'Unknown chip type' });
    }

    // Create chip effect
    const { error: effectError } = await supabase
      .from('chip_effects')
      .insert({
        user_id: userId,
        target_user_id: targetUserId || userId,
        chip_type: chipType,
        effect_data: effectData,
        gameweek: gameweek,
        active_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week
      });

    if (effectError) {
      console.error('Error creating chip effect:', effectError);
      return res.status(500).json({ error: 'Failed to apply chip effect' });
    }

    // Remove chip from inventory
    const { error: inventoryError } = await supabase
      .from('user_chip_inventory')
      .update({ 
        quantity: supabase.raw('quantity - 1'),
        used_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('chip_def_id', chipDef.id)
      .gt('quantity', 0);

    if (inventoryError) {
      console.error('Error updating chip inventory:', inventoryError);
      return res.status(500).json({ error: 'Failed to update chip inventory' });
    }

    // Set cooldown
    const cooldownHours = chipType === 'Captain Curse' ? 168 : 24; // 1 week for legendary, 1 day for others
    const cooldownUntil = new Date(Date.now() + cooldownHours * 60 * 60 * 1000);

    await supabase
      .from('chip_cooldowns')
      .insert({
        user_id: userId,
        target_user_id: targetUserId,
        chip_type: chipType,
        used_at: new Date().toISOString(),
        cooldown_until: cooldownUntil.toISOString()
      });

    // Create notification for target user (if applicable)
    if (targetUserId && targetUserId !== userId) {
      await supabase
        .from('chip_notifications')
        .insert({
          user_id: targetUserId,
          from_user_id: userId,
          chip_type: chipType,
          message: `A ${chipType} chip was used on you!`
        });
    }

    res.status(200).json({
      success: true,
      message: message,
      chip_type: chipType,
      effect_data: effectData
    });

  } catch (error) {
    console.error('Error in use-chip API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

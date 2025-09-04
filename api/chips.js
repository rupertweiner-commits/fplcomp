import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { action } = req.query;

    switch (action) {
      case 'use':
        return await handleUseChip(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Chips API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function handleUseChip(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, chipType, targetUserId, playerId } = req.body;

  if (!userId || !chipType) {
    return res.status(400).json({ error: 'User ID and chip type required' });
  }

  // Check if user has the chip available
  const { data: userChips, error: chipsError } = await supabase
    .from('user_chips')
    .select('*')
    .eq('user_id', userId)
    .eq('chip_type', chipType)
    .eq('is_used', false)
    .single();

  if (chipsError || !userChips) {
    return res.status(400).json({ error: 'Chip not available or already used' });
  }

  // Mark chip as used
  const { data: updatedChip, error: updateError } = await supabase
    .from('user_chips')
    .update({
      is_used: true,
      used_at: new Date().toISOString(),
      used_on_user_id: targetUserId,
      used_on_player_id: playerId
    })
    .eq('id', userChips.id)
    .select()
    .single();

  if (updateError) {
    throw updateError;
  }

  // Create chip usage record
  const { data: chipUsage, error: usageError } = await supabase
    .from('chip_usage')
    .insert({
      user_id: userId,
      chip_type: chipType,
      target_user_id: targetUserId,
      player_id: playerId,
      gameweek: 1, // Current gameweek
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (usageError) {
    throw usageError;
  }

  // If it's a transfer chip, create a transfer record
  if (chipType === 'transfer' && targetUserId && playerId) {
    const { data: player, error: playerError } = await supabase
      .from('chelsea_players')
      .select('*')
      .eq('id', playerId)
      .single();

    if (!playerError && player) {
      await supabase
        .from('player_transfers')
        .insert({
          from_user_id: userId,
          to_user_id: targetUserId,
          player_id: playerId,
          player_name: player.name,
          transfer_type: 'chip_transfer',
          gameweek: 1,
          chip_used: chipType
        });
    }
  }

  res.status(200).json({
    success: true,
    message: `${chipType} chip used successfully`,
    data: {
      chip: updatedChip,
      usage: chipUsage
    }
  });
}

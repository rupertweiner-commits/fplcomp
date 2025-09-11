import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { playerId } = req.query;

    // Test 1: Check if player exists
    const { data: playerData, error: playerError } = await supabase
      .from('chelsea_players')
      .select('id, name, position, price, assigned_to_user_id')
      .eq('id', playerId);

    console.log('Player query result:', { playerData, playerError });

    // Test 2: Check RLS policies by trying to update
    const { data: updateData, error: updateError } = await supabase
      .from('chelsea_players')
      .update({ assigned_to_user_id: 'test-user-id' })
      .eq('id', playerId)
      .select();

    console.log('Update query result:', { updateData, updateError });

    // Test 3: Check current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('Current user:', { user, userError });

    res.status(200).json({
      success: true,
      debug: {
        playerQuery: { data: playerData, error: playerError },
        updateQuery: { data: updateData, error: updateError },
        currentUser: { user, error: userError }
      }
    });

  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
  }

  try {
    // Check if user can open loot box (daily cooldown)
    const { data: lastOpen, error: lastOpenError } = await supabase
      .from('user_chip_inventory')
      .select('acquired_at')
      .eq('user_id', userId)
      .order('acquired_at', { ascending: false })
      .limit(1);

    if (lastOpenError) {
      console.error('Error checking last loot box open:', lastOpenError);
      return res.status(500).json({ error: 'Failed to check loot box cooldown' });
    }

    // Check if user opened loot box today
    if (lastOpen && lastOpen.length > 0) {
      const lastOpenDate = new Date(lastOpen[0].acquired_at);
      const today = new Date();
      const isSameDay = lastOpenDate.toDateString() === today.toDateString();
      
      if (isSameDay) {
        return res.status(400).json({ 
          error: 'You can only open one loot box per day. Try again tomorrow!' 
        });
      }
    }

    // Get user's current position (simplified - you might want to calculate this properly)
    const { data: leaderboard, error: leaderboardError } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, total_points')
      .order('total_points', { ascending: false });

    if (leaderboardError) {
      console.error('Error fetching leaderboard:', leaderboardError);
      return res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }

    const userPosition = leaderboard.findIndex(user => user.id === userId) + 1;
    const totalUsers = leaderboard.length;

    // Calculate drop rates based on position
    let dropRates = {
      rare: 25,
      epic: 15,
      legendary: 5
    };

    // Adjust rates based on position (better rates for lower positions)
    if (userPosition > totalUsers * 0.7) { // Bottom 30%
      dropRates.rare = 35;
      dropRates.epic = 20;
      dropRates.legendary = 8;
    } else if (userPosition > totalUsers * 0.5) { // Middle 20%
      dropRates.rare = 30;
      dropRates.epic = 18;
      dropRates.legendary = 6;
    }

    // Generate random number to determine rarity
    const random = Math.random() * 100;
    let selectedRarity = 'rare';

    if (random < dropRates.legendary) {
      selectedRarity = 'legendary';
    } else if (random < dropRates.legendary + dropRates.epic) {
      selectedRarity = 'epic';
    } else if (random < dropRates.legendary + dropRates.epic + dropRates.rare) {
      selectedRarity = 'rare';
    }

    // Get random chip of selected rarity
    const { data: chips, error: chipsError } = await supabase
      .from('chip_definitions')
      .select('*')
      .eq('rarity', selectedRarity)
      .order('random()')
      .limit(1);

    if (chipsError || !chips || chips.length === 0) {
      console.error('Error fetching chips:', chipsError);
      return res.status(500).json({ error: 'Failed to fetch chips' });
    }

    const selectedChip = chips[0];

    // Add chip to user's inventory
    const { error: inventoryError } = await supabase
      .from('user_chip_inventory')
      .insert({
        user_id: userId,
        chip_def_id: selectedChip.id,
        quantity: 1
      });

    if (inventoryError) {
      console.error('Error adding chip to inventory:', inventoryError);
      return res.status(500).json({ error: 'Failed to add chip to inventory' });
    }

    res.status(200).json({
      success: true,
      chip: {
        id: selectedChip.id,
        name: selectedChip.name,
        description: selectedChip.description,
        rarity: selectedChip.rarity,
        icon: selectedChip.icon,
        gradient: selectedChip.gradient,
        border_color: selectedChip.border_color,
        text_color: selectedChip.text_color,
        effect_value: selectedChip.effect_value
      },
      position: userPosition,
      total_users: totalUsers,
      drop_rates: dropRates
    });

  } catch (error) {
    console.error('Error in open-loot-box API:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

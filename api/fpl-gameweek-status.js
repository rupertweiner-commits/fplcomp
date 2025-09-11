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
    // Get current gameweek from FPL API
    const fplResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    const fplData = await fplResponse.json();
    
    const currentGameweek = fplData.events.find(event => event.is_current);
    const nextGameweek = fplData.events.find(event => event.is_next);
    
    if (!currentGameweek) {
      return res.status(404).json({ error: 'No current gameweek found' });
    }

    // Check if gameweek is active for chip usage
    const now = new Date();
    const deadline = new Date(currentGameweek.deadline_time);
    const isActive = now < deadline;

    // Update gameweek status in database
    await supabase
      .from('gameweek_status')
      .upsert({
        gameweek: currentGameweek.id,
        is_active: isActive,
        deadline_time: currentGameweek.deadline_time,
        last_updated: now.toISOString()
      });

    // Get next gameweek info
    const nextDeadline = nextGameweek ? new Date(nextGameweek.deadline_time) : null;
    const timeUntilDeadline = deadline - now;
    const hoursUntilDeadline = Math.max(0, Math.floor(timeUntilDeadline / (1000 * 60 * 60)));
    const minutesUntilDeadline = Math.max(0, Math.floor((timeUntilDeadline % (1000 * 60 * 60)) / (1000 * 60)));

    res.status(200).json({
      current: {
        id: currentGameweek.id,
        name: currentGameweek.name,
        deadline_time: currentGameweek.deadline_time,
        is_active: isActive,
        hours_until_deadline: hoursUntilDeadline,
        minutes_until_deadline: minutesUntilDeadline
      },
      next: nextGameweek ? {
        id: nextGameweek.id,
        name: nextGameweek.name,
        deadline_time: nextGameweek.deadline_time
      } : null,
      chip_usage_active: isActive,
      chip_usage_message: isActive 
        ? `Chips can be used until ${deadline.toLocaleString()}`
        : `Chip usage closed. Next deadline: ${nextDeadline ? nextDeadline.toLocaleString() : 'TBD'}`
    });

  } catch (error) {
    console.error('Error fetching gameweek status:', error);
    res.status(500).json({ 
      error: 'Failed to fetch gameweek status',
      details: error.message 
    });
  }
}

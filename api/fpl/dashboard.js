// Vercel API route for FPL dashboard data
// GET /api/fpl/dashboard

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch multiple FPL endpoints in parallel
    const [bootstrapResponse, currentGameweekResponse] = await Promise.all([
      fetch('https://fantasy.premierleague.com/api/bootstrap-static/'),
      fetch('https://fantasy.premierleague.com/api/me/')
    ]);

    if (!bootstrapResponse.ok || !currentGameweekResponse.ok) {
      throw new Error('Failed to fetch FPL data');
    }

    const [bootstrapData, currentGameweekData] = await Promise.all([
      bootstrapResponse.json(),
      currentGameweekResponse.json()
    ]);

    // Extract relevant dashboard data
    const dashboardData = {
      current_gameweek: bootstrapData.current_event,
      next_gameweek: bootstrapData.next_event,
      total_players: bootstrapData.total_players,
      total_teams: bootstrapData.teams?.length || 0,
      total_events: bootstrapData.events?.length || 0,
      gameweek_deadline: bootstrapData.events?.find(e => e.id === bootstrapData.current_event)?.deadline_time,
      next_deadline: bootstrapData.events?.find(e => e.id === bootstrapData.next_event)?.deadline_time,
      top_players: bootstrapData.elements
        ?.sort((a, b) => b.total_points - a.total_points)
        ?.slice(0, 10)
        ?.map(player => ({
          id: player.id,
          name: `${player.first_name} ${player.second_name}`,
          team: bootstrapData.teams?.find(t => t.id === player.team)?.name || 'Unknown',
          position: bootstrapData.element_types?.find(t => t.id === player.element_type)?.singular_name || 'Unknown',
          total_points: player.total_points,
          form: player.form,
          price: player.now_cost / 10
        })) || [],
      recent_news: bootstrapData.elements
        ?.filter(player => player.news && player.news !== '')
        ?.slice(0, 5)
        ?.map(player => ({
          id: player.id,
          name: `${player.first_name} ${player.second_name}`,
          news: player.news,
          news_added: player.news_added
        })) || []
    };
    
    // Cache for 5 minutes
    res.setHeader('Cache-Control', 'public, max-age=300');
    
    return res.status(200).json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching FPL dashboard data:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data',
      details: error.message
    });
  }
}

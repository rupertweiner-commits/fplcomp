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
      case 'sync-chelsea-players':
        return await handleSyncChelseaPlayers(req, res);
      case 'sync-status':
        return await handleSyncStatus(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('FPL Sync API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function handleSyncChelseaPlayers(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch FPL bootstrap data
    const fplResponse = await fetch('https://fantasy.premierleague.com/api/bootstrap-static/');
    if (!fplResponse.ok) {
      throw new Error(`FPL API error: ${fplResponse.status}`);
    }
    
    const fplData = await fplResponse.json();
    
    // Find Chelsea team (team ID 4)
    const chelseaTeam = fplData.teams.find(team => team.id === 4);
    if (!chelseaTeam) {
      throw new Error('Chelsea team not found in FPL data');
    }
    
    // Get Chelsea players
    const chelseaPlayers = fplData.elements.filter(player => player.team === 4);
    
    console.log(`Found ${chelseaPlayers.length} Chelsea players in FPL API`);
    
    // Log sync start
    const { data: syncLog, error: logError } = await supabase
      .from('fpl_sync_log')
      .insert({
        sync_type: 'players',
        status: 'in_progress',
        sync_started_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (logError) {
      console.error('Failed to create sync log:', logError);
    }
    
    let playersUpdated = 0;
    let playersCreated = 0;
    
    // Upsert each Chelsea player
    for (const player of chelseaPlayers) {
      const playerData = {
        fpl_id: player.id,
        name: `${player.first_name} ${player.second_name}`,
        position: mapFPLPosition(player.element_type),
        price: player.now_cost / 10, // FPL stores prices in tenths
        team_id: player.team,
        is_available: player.status === 'a', // 'a' = available
        last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: existingPlayer } = await supabase
        .from('chelsea_players')
        .select('id')
        .eq('fpl_id', player.id)
        .single();
      
      if (existingPlayer) {
        // Update existing player
        const { error: updateError } = await supabase
          .from('chelsea_players')
          .update(playerData)
          .eq('fpl_id', player.id);
        
        if (updateError) {
          console.error(`Failed to update player ${player.id}:`, updateError);
        } else {
          playersUpdated++;
        }
      } else {
        // Create new player
        const { error: insertError } = await supabase
          .from('chelsea_players')
          .insert({
            ...playerData,
            created_at: new Date().toISOString()
          });
        
        if (insertError) {
          console.error(`Failed to insert player ${player.id}:`, insertError);
        } else {
          playersCreated++;
        }
      }
    }
    
    // Update sync log
    if (syncLog) {
      await supabase
        .from('fpl_sync_log')
        .update({
          status: 'success',
          records_updated: playersUpdated + playersCreated,
          sync_completed_at: new Date().toISOString()
        })
        .eq('id', syncLog.id);
    }
    
    res.status(200).json({
      success: true,
      message: 'Chelsea players synced successfully',
      data: {
        playersUpdated,
        playersCreated,
        totalPlayers: chelseaPlayers.length,
        syncLogId: syncLog?.id
      }
    });
    
  } catch (error) {
    console.error('Failed to sync Chelsea players:', error);
    
    // Update sync log with error
    const { data: recentLog } = await supabase
      .from('fpl_sync_log')
      .select('id')
      .eq('sync_type', 'players')
      .order('sync_started_at', { ascending: false })
      .limit(1)
      .single();
    
    if (recentLog) {
      await supabase
        .from('fpl_sync_log')
        .update({
          status: 'error',
          error_message: error.message,
          sync_completed_at: new Date().toISOString()
        })
        .eq('id', recentLog.id);
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

async function handleSyncStatus(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get recent sync logs
    const { data: syncLogs, error } = await supabase
      .from('fpl_sync_log')
      .select('*')
      .order('sync_started_at', { ascending: false })
      .limit(10);
    
    if (error) {
      throw error;
    }
    
    // Get current player count
    const { count: playerCount, error: countError } = await supabase
      .from('chelsea_players')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Failed to get player count:', countError);
    }
    
    res.status(200).json({
      success: true,
      data: {
        playerCount: playerCount || 0,
        recentSyncs: syncLogs || []
      }
    });
    
  } catch (error) {
    console.error('Failed to get sync status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

function mapFPLPosition(elementType) {
  // FPL element types: 1=GK, 2=DEF, 3=MID, 4=FWD
  const positionMap = {
    1: 'GK',
    2: 'DEF', 
    3: 'MID',
    4: 'FWD'
  };
  return positionMap[elementType] || 'MID';
}

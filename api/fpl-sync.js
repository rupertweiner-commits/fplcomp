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
      case 'clear-and-sync':
        return await handleClearAndSync(req, res);
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
    
    // Get Chelsea players - filter for current squad members
    const allChelseaPlayers = fplData.elements.filter(player => player.team === 4);
    
    // Filter out players who have left Chelsea (based on news/status)
    const chelseaPlayers = allChelseaPlayers.filter(player => {
      // Include players who are available, injured, or suspended
      const isActive = ['a', 'i', 's'].includes(player.status);
      
      // Exclude players with transfer news indicating they left
      const hasTransferNews = player.news && (
        player.news.toLowerCase().includes('transfer') ||
        player.news.toLowerCase().includes('sold') ||
        player.news.toLowerCase().includes('released') ||
        player.news.toLowerCase().includes('contract terminated')
      );
      
      return isActive && !hasTransferNews;
    });
    
    console.log(`Found ${allChelseaPlayers.length} total Chelsea players in FPL API`);
    console.log(`Filtered to ${chelseaPlayers.length} current Chelsea players`);
    console.log('Chelsea team info:', chelseaTeam);
    
    // Log some player details for debugging
    console.log('Sample current Chelsea players:', chelseaPlayers.slice(0, 10).map(p => ({
      id: p.id,
      name: `${p.first_name} ${p.second_name}`,
      position: p.element_type,
      status: p.status,
      news: p.news,
      price: p.now_cost / 10
    })));
    
    // Log players that were filtered out
    const filteredOut = allChelseaPlayers.filter(player => !chelseaPlayers.includes(player));
    if (filteredOut.length > 0) {
      console.log('Filtered out players:', filteredOut.map(p => ({
        name: `${p.first_name} ${p.second_name}`,
        status: p.status,
        news: p.news
      })));
    }
    
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
    console.log(`🔄 Starting to upsert ${chelseaPlayers.length} players...`);
    
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
      
      console.log(`🔄 Processing player: ${playerData.name} (FPL ID: ${playerData.fpl_id})`);
      
      const { data: existingPlayer, error: selectError } = await supabase
        .from('chelsea_players')
        .select('id, fpl_id, name')
        .eq('fpl_id', player.id)
        .single();
      
      if (selectError && selectError.code !== 'PGRST116') {
        console.error(`❌ Error checking existing player ${player.id}:`, selectError);
      }
      
      if (existingPlayer) {
        console.log(`📝 Updating existing player: ${existingPlayer.name} (DB ID: ${existingPlayer.id})`);
        // Update existing player
        const { error: updateError } = await supabase
          .from('chelsea_players')
          .update(playerData)
          .eq('fpl_id', player.id);
        
        if (updateError) {
          console.error(`❌ Failed to update player ${player.id} (${playerData.name}):`, updateError);
        } else {
          console.log(`✅ Updated player: ${playerData.name}`);
          playersUpdated++;
        }
      } else {
        console.log(`➕ Creating new player: ${playerData.name}`);
        // Create new player
        const { error: insertError } = await supabase
          .from('chelsea_players')
          .insert({
            ...playerData,
            created_at: new Date().toISOString()
          });
        
        if (insertError) {
          console.error(`❌ Failed to insert player ${player.id} (${playerData.name}):`, insertError);
        } else {
          console.log(`✅ Created player: ${playerData.name}`);
          playersCreated++;
        }
      }
    }
    
    console.log(`📊 Upsert summary: ${playersCreated} created, ${playersUpdated} updated`);
    
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
    
    // Fetch the synced players from database to return them
    const { data: syncedPlayers, error: fetchError } = await supabase
      .from('chelsea_players')
      .select('*')
      .order('name');

    if (fetchError) {
      console.error('Failed to fetch synced players:', fetchError);
    } else {
      console.log(`✅ Successfully synced ${syncedPlayers?.length || 0} players to Supabase`);
      console.log('Sample synced players from DB:', syncedPlayers?.slice(0, 5).map(p => ({
        id: p.id,
        fpl_id: p.fpl_id,
        name: p.name,
        position: p.position,
        price: p.price,
        is_available: p.is_available
      })));
    }

    res.status(200).json({
      success: true,
      message: 'Chelsea players synced successfully',
      data: {
        playersUpdated,
        playersCreated,
        totalPlayers: chelseaPlayers.length,
        syncLogId: syncLog?.id,
        players: syncedPlayers || []
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

async function handleClearAndSync(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🗑️ Clearing existing Chelsea players data...');
    
    // Clear all existing Chelsea players
    const { error: deleteError } = await supabase
      .from('chelsea_players')
      .delete()
      .neq('id', 0); // Delete all rows
    
    if (deleteError) {
      console.error('❌ Failed to clear existing data:', deleteError);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to clear existing data',
        details: deleteError.message 
      });
    }
    
    console.log('✅ Cleared existing Chelsea players data');
    
    // Now run the normal sync
    return await handleSyncChelseaPlayers(req, res);
    
  } catch (error) {
    console.error('❌ Clear and sync error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Clear and sync failed',
      details: error.message 
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

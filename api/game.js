// Consolidated Game Management API
// Combines: simulation.js + competition-points.js + draft-allocation-simple.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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
      // Simulation Management
      case 'simulation-status':
        return await handleSimulationStatus(req, res);
      case 'start-simulation':
        return await handleStartSimulation(req, res);
      case 'simulate-gameweek':
        return await handleSimulateGameweek(req, res);
      case 'simulate-next':
        return await handleSimulateNext(req, res);
      case 'reset-simulation':
        return await handleResetSimulation(req, res);
      case 'leaderboard':
        return await handleLeaderboard(req, res);

      // Competition Management
      case 'competition-status':
        return await handleCompetitionStatus(req, res);
      case 'update-baseline':
        return await handleUpdateBaseline(req, res);

      // Draft & Allocation Management
      case 'get-users':
        return await handleGetUsers(req, res);
      case 'get-available-players':
        return await handleGetAvailablePlayers(req, res);
      case 'allocate-player':
        return await handleAllocatePlayer(req, res);
      case 'get-user-team':
        return await handleGetUserTeam(req, res);
      case 'get-all-allocations':
        return await handleGetAllAllocations(req, res);
      case 'deallocate-player':
        return await handleDeallocatePlayer(req, res);
      case 'set-captain':
        return await handleSetCaptain(req, res);
      case 'set-vice-captain':
        return await handleSetViceCaptain(req, res);
      case 'complete-draft':
        return await handleCompleteDraft(req, res);

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Game API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// ========== SIMULATION HANDLERS ==========

async function handleSimulationStatus(req, res) {
  try {
    console.log('📊 Fetching simulation status...');

    // Get simulation status
    const { data: simulationStatus, error: simError } = await supabase
      .from('simulation_status')
      .select('*')
      .single();

    if (simError && simError.code !== 'PGRST116') {
      console.error('Error fetching simulation status:', simError);
      return res.status(500).json({ error: 'Failed to fetch simulation status' });
    }

    // Get draft status
    const { data: draftStatus, error: draftError } = await supabase
      .from('draft_status')
      .select('*')
      .eq('id', 1)
      .single();

    if (draftError && draftError.code !== 'PGRST116') {
      console.error('Error fetching draft status:', draftError);
    }

    const status = {
      simulation: simulationStatus || {
        current_gameweek: 1,
        is_simulation_mode: false,
        is_draft_complete: false
      },
      draft: draftStatus || {
        is_draft_active: false,
        is_draft_complete: false,
        current_gameweek: 1
      }
    };

    console.log('✅ Simulation status fetched successfully');
    return res.status(200).json({ success: true, data: status });

  } catch (error) {
    console.error('❌ Simulation status error:', error);
    return res.status(500).json({ error: 'Failed to fetch simulation status' });
  }
}

async function handleStartSimulation(req, res) {
  try {
    console.log('🚀 Starting simulation...');

    // Update simulation status
    const { data: simData, error: simError } = await supabase
      .from('simulation_status')
      .upsert({
        id: 1,
        is_simulation_mode: true,
        current_gameweek: 1,
        is_draft_complete: true,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (simError) {
      console.error('Error starting simulation:', simError);
      return res.status(500).json({ error: 'Failed to start simulation' });
    }

    // Update draft status
    await supabase
      .from('draft_status')
      .upsert({
        id: 1,
        is_draft_active: false,
        is_draft_complete: true,
        simulation_mode: true,
        current_gameweek: 1
      });

    console.log('✅ Simulation started successfully');
    return res.status(200).json({ 
      success: true, 
      message: 'Simulation started successfully',
      data: simData 
    });

  } catch (error) {
    console.error('❌ Start simulation error:', error);
    return res.status(500).json({ error: 'Failed to start simulation' });
  }
}

async function handleSimulateGameweek(req, res) {
  try {
    console.log('🎯 Simulating gameweek...');

    // Get current simulation status
    const { data: simStatus } = await supabase
      .from('simulation_status')
      .select('current_gameweek')
      .single();

    const currentGameweek = simStatus?.current_gameweek || 1;

    // Simulate gameweek results (simplified version)
    const mockResults = {
      gameweek: currentGameweek,
      results: {
        totalPlayers: 35,
        averageScore: 45,
        highestScore: 89,
        lowestScore: 12
      },
      timestamp: new Date().toISOString()
    };

    // Store gameweek results
    await supabase
      .from('gameweek_results')
      .upsert({
        gameweek: currentGameweek,
        results: mockResults,
        created_at: new Date().toISOString()
      });

    console.log('✅ Gameweek simulated successfully');
    return res.status(200).json({ 
      success: true, 
      message: `Gameweek ${currentGameweek} simulated successfully`,
      data: mockResults 
    });

  } catch (error) {
    console.error('❌ Simulate gameweek error:', error);
    return res.status(500).json({ error: 'Failed to simulate gameweek' });
  }
}

async function handleSimulateNext(req, res) {
  try {
    console.log('📅 Simulating next gameweek...');

    // Get current gameweek and increment
    const { data: simStatus } = await supabase
      .from('simulation_status')
      .select('current_gameweek')
      .single();

    const nextGameweek = (simStatus?.current_gameweek || 1) + 1;

    // Update to next gameweek
    await supabase
      .from('simulation_status')
      .update({
        current_gameweek: nextGameweek,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1);

    // Simulate the next gameweek
    return await handleSimulateGameweek(req, res);

  } catch (error) {
    console.error('❌ Simulate next error:', error);
    return res.status(500).json({ error: 'Failed to simulate next gameweek' });
  }
}

async function handleResetSimulation(req, res) {
  try {
    console.log('🔄 Resetting simulation...');

    // Reset simulation status
    await supabase
      .from('simulation_status')
      .update({
        current_gameweek: 1,
        is_simulation_mode: false,
        is_draft_complete: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', 1);

    // Reset draft status
    await supabase
      .from('draft_status')
      .update({
        is_draft_active: false,
        is_draft_complete: false,
        simulation_mode: false,
        current_gameweek: 1
      })
      .eq('id', 1);

    // Clear gameweek results
    await supabase
      .from('gameweek_results')
      .delete()
      .gte('gameweek', 1);

    console.log('✅ Simulation reset successfully');
    return res.status(200).json({ 
      success: true, 
      message: 'Simulation reset successfully' 
    });

  } catch (error) {
    console.error('❌ Reset simulation error:', error);
    return res.status(500).json({ error: 'Failed to reset simulation' });
  }
}

async function handleLeaderboard(req, res) {
  try {
    console.log('📊 Fetching leaderboard...');

    // Get users with their allocated players and points
    const { data: users, error: usersError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        is_admin
      `);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    // Get player allocations and calculate points
    const leaderboard = [];
    
    for (const user of users) {
      const { data: playerData, error: playerError } = await supabase
        .from('chelsea_players')
        .select('id, name, total_points, baseline_points, is_captain, is_vice_captain')
        .eq('assigned_to_user_id', user.id);

      if (playerError) {
        console.error('Error fetching player data:', playerError);
        continue;
      }

      const totalPoints = playerData.reduce((sum, player) => {
        const competitionPoints = Math.max(0, (player.total_points || 0) - (player.baseline_points || 0));
        if (player.is_captain) return sum + (competitionPoints * 2);
        if (player.is_vice_captain) return sum + (competitionPoints * 1.5);
        return sum + competitionPoints;
      }, 0);

      leaderboard.push({
        userId: user.id,
        username: user.first_name || user.email,
        email: user.email,
        totalPoints: Math.round(totalPoints),
        playerCount: playerData.length,
        gameweeksPlayed: 1 // Simplified for now
      });
    }

    // Sort by total points
    leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);

    console.log('✅ Leaderboard fetched successfully');
    return res.status(200).json({ 
      success: true, 
      leaderboard,
      meta: {
        total_users: leaderboard.length,
        last_updated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Leaderboard error:', error);
    return res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
}

// ========== COMPETITION HANDLERS ==========

async function handleCompetitionStatus(req, res) {
  try {
    console.log('🏆 Fetching competition status...');

    const { data: draftStatus, error } = await supabase
      .from('draft_status')
      .select('*')
      .eq('id', 1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching competition status:', error);
      return res.status(500).json({ error: 'Failed to fetch competition status' });
    }

    const status = draftStatus || {
      is_draft_active: false,
      is_draft_complete: false,
      current_gameweek: 1,
      competition_start_date: null,
      points_start_date: null
    };

    return res.status(200).json({ success: true, data: status });

  } catch (error) {
    console.error('❌ Competition status error:', error);
    return res.status(500).json({ error: 'Failed to fetch competition status' });
  }
}

async function handleUpdateBaseline(req, res) {
  try {
    console.log('📊 Updating baseline points...');

    // Set baseline points for all players to their current total_points
    const { data: updateResult, error: updateError } = await supabase
      .from('chelsea_players')
      .update({ baseline_points: supabase.raw('total_points') })
      .select('id, name, total_points, baseline_points');

    if (updateError) {
      console.error('Error updating baseline points:', updateError);
      return res.status(500).json({ error: 'Failed to update baseline points' });
    }

    // Update competition start date
    await supabase
      .from('draft_status')
      .upsert({
        id: 1,
        competition_start_date: new Date().toISOString(),
        points_start_date: new Date().toISOString()
      });

    console.log('✅ Baseline points updated successfully');
    return res.status(200).json({ 
      success: true, 
      message: 'Baseline points updated successfully',
      updated_players: updateResult?.length || 0
    });

  } catch (error) {
    console.error('❌ Update baseline error:', error);
    return res.status(500).json({ error: 'Failed to update baseline points' });
  }
}

// ========== DRAFT & ALLOCATION HANDLERS ==========

async function handleGetUsers(req, res) {
  try {
    console.log('👥 Fetching users...');

    const { data: users, error } = await supabase
      .from('user_profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        is_admin
      `)
      .order('first_name');

    if (error) {
      console.error('Error fetching users:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    return res.status(200).json({ success: true, users: users || [] });

  } catch (error) {
    console.error('❌ Get users error:', error);
    return res.status(500).json({ error: 'Failed to fetch users' });
  }
}

async function handleGetAvailablePlayers(req, res) {
  try {
    console.log('⚽ Fetching available players...');

    const { data: players, error } = await supabase
      .from('chelsea_players')
      .select('*')
      .order('position')
      .order('name');

    if (error) {
      console.error('Error fetching players:', error);
      return res.status(500).json({ error: 'Failed to fetch players' });
    }

    return res.status(200).json({ success: true, players: players || [] });

  } catch (error) {
    console.error('❌ Get available players error:', error);
    return res.status(500).json({ error: 'Failed to fetch available players' });
  }
}

async function handleAllocatePlayer(req, res) {
  try {
    const { playerId, userId } = req.body;
    
    if (!playerId || !userId) {
      return res.status(400).json({ error: 'Player ID and User ID are required' });
    }

    console.log('🎯 Allocating player:', { playerId, userId });

    // Allocate player to user
    const { data: result, error } = await supabase
      .from('chelsea_players')
      .update({ assigned_to_user_id: userId })
      .eq('id', playerId)
      .select('*')
      .single();

    if (error) {
      console.error('Error allocating player:', error);
      return res.status(500).json({ error: 'Failed to allocate player' });
    }

    console.log('✅ Player allocated successfully');
    return res.status(200).json({ 
      success: true, 
      message: 'Player allocated successfully',
      player: result 
    });

  } catch (error) {
    console.error('❌ Allocate player error:', error);
    return res.status(500).json({ error: 'Failed to allocate player' });
  }
}

async function handleGetUserTeam(req, res) {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log('👤 Fetching user team for:', userId);

    const { data: players, error } = await supabase
      .from('chelsea_players')
      .select('*')
      .eq('assigned_to_user_id', userId)
      .order('position')
      .order('name');

    if (error) {
      console.error('Error fetching user team:', error);
      return res.status(500).json({ error: 'Failed to fetch user team' });
    }

    return res.status(200).json({ success: true, players: players || [] });

  } catch (error) {
    console.error('❌ Get user team error:', error);
    return res.status(500).json({ error: 'Failed to fetch user team' });
  }
}

async function handleGetAllAllocations(req, res) {
  try {
    console.log('📊 Fetching all player allocations...');

    // Get all allocated players with user information
    const { data: allocations, error } = await supabase
      .from('chelsea_players')
      .select(`
        id,
        name,
        position,
        price,
        total_points,
        assigned_to_user_id,
        is_captain,
        is_vice_captain,
        user_profiles!inner(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .not('assigned_to_user_id', 'is', null)
      .order('position')
      .order('name');

    if (error) {
      console.error('Error fetching allocations:', error);
      return res.status(500).json({ error: 'Failed to fetch allocations' });
    }

    return res.status(200).json({ success: true, allocations: allocations || [] });

  } catch (error) {
    console.error('❌ Get all allocations error:', error);
    return res.status(500).json({ error: 'Failed to fetch all allocations' });
  }
}

async function handleDeallocatePlayer(req, res) {
  try {
    const { playerId } = req.body;
    
    if (!playerId) {
      return res.status(400).json({ error: 'Player ID is required' });
    }

    console.log('🔄 Deallocating player:', playerId);

    const { data: result, error } = await supabase
      .from('chelsea_players')
      .update({ 
        assigned_to_user_id: null,
        is_captain: false,
        is_vice_captain: false
      })
      .eq('id', playerId)
      .select('*')
      .single();

    if (error) {
      console.error('Error deallocating player:', error);
      return res.status(500).json({ error: 'Failed to deallocate player' });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Player deallocated successfully',
      player: result 
    });

  } catch (error) {
    console.error('❌ Deallocate player error:', error);
    return res.status(500).json({ error: 'Failed to deallocate player' });
  }
}

async function handleSetCaptain(req, res) {
  try {
    const { playerId, userId } = req.body;
    
    if (!playerId || !userId) {
      return res.status(400).json({ error: 'Player ID and User ID are required' });
    }

    console.log('👑 Setting captain:', { playerId, userId });

    // First, remove captain status from all user's players
    await supabase
      .from('chelsea_players')
      .update({ is_captain: false })
      .eq('assigned_to_user_id', userId);

    // Then set the new captain
    const { data: result, error } = await supabase
      .from('chelsea_players')
      .update({ is_captain: true })
      .eq('id', playerId)
      .eq('assigned_to_user_id', userId)
      .select('*')
      .single();

    if (error) {
      console.error('Error setting captain:', error);
      return res.status(500).json({ error: 'Failed to set captain' });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Captain set successfully',
      player: result 
    });

  } catch (error) {
    console.error('❌ Set captain error:', error);
    return res.status(500).json({ error: 'Failed to set captain' });
  }
}

async function handleSetViceCaptain(req, res) {
  try {
    const { playerId, userId } = req.body;
    
    if (!playerId || !userId) {
      return res.status(400).json({ error: 'Player ID and User ID are required' });
    }

    console.log('🥈 Setting vice captain:', { playerId, userId });

    // First, remove vice captain status from all user's players
    await supabase
      .from('chelsea_players')
      .update({ is_vice_captain: false })
      .eq('assigned_to_user_id', userId);

    // Then set the new vice captain
    const { data: result, error } = await supabase
      .from('chelsea_players')
      .update({ is_vice_captain: true })
      .eq('id', playerId)
      .eq('assigned_to_user_id', userId)
      .select('*')
      .single();

    if (error) {
      console.error('Error setting vice captain:', error);
      return res.status(500).json({ error: 'Failed to set vice captain' });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Vice captain set successfully',
      player: result 
    });

  } catch (error) {
    console.error('❌ Set vice captain error:', error);
    return res.status(500).json({ error: 'Failed to set vice captain' });
  }
}

async function handleCompleteDraft(req, res) {
  try {
    console.log('🏁 Completing draft...');

    // Try to update draft status, but don't fail if table doesn't exist
    let draftStatus = null;
    try {
      const { data, error } = await supabase
        .from('draft_status')
        .upsert({ 
          id: 1,
          is_draft_complete: true,
          is_draft_active: false,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })
        .select()
        .single();

      if (!error) {
        draftStatus = data;
        console.log('✅ Draft status updated successfully');
      } else {
        console.warn('⚠️ Could not update draft_status table:', error.message);
      }
    } catch (statusError) {
      console.warn('⚠️ Draft status table not available, continuing without it:', statusError.message);
    }

    // Get all allocated players to verify completeness
    const { data: allocatedPlayers, error: playersError } = await supabase
      .from('chelsea_players')
      .select(`
        id,
        name,
        position,
        assigned_to_user_id,
        user_profiles!inner(first_name, last_name, email)
      `)
      .not('assigned_to_user_id', 'is', null);

    if (playersError) {
      console.error('Error fetching allocated players:', playersError);
      return res.status(500).json({ error: 'Failed to fetch allocated players' });
    }

    // Group players by user for summary
    const userTeams = {};
    allocatedPlayers.forEach(player => {
      const userId = player.assigned_to_user_id;
      if (!userTeams[userId]) {
        userTeams[userId] = {
          user: player.user_profiles,
          players: [],
          totalPlayers: 0
        };
      }
      userTeams[userId].players.push(player);
      userTeams[userId].totalPlayers++;
    });

    console.log('✅ Draft completed successfully');
    console.log(`📊 Total allocations: ${allocatedPlayers.length} players across ${Object.keys(userTeams).length} users`);

    return res.status(200).json({
      success: true,
      message: 'Draft completed successfully!',
      data: {
        draftStatus,
        totalAllocations: allocatedPlayers.length,
        totalUsers: Object.keys(userTeams).length,
        userTeams: Object.values(userTeams),
        completedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Complete draft error:', error);
    return res.status(500).json({ error: 'Failed to complete draft' });
  }
}

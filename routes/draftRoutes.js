import express from 'express';
import { DraftService } from '../services/draftService.js';
import { FPLApiService } from '../services/fplApiService.js';
import jwt from 'jsonwebtoken';
import { activityLogger } from '../services/activityLoggerService.js';

// JWT secret - in production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Admin authentication middleware
const requireAdmin = async (req, res, next) => {
  try {
    // For GET requests, check query parameters; for POST requests, check body
    const userId = req.method === 'GET' ? req.query.userId : req.body.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID required for admin operations',
        message: 'Add ?userId=X to URL for GET requests or include userId in body for POST requests'
      });
    }

    const isAdmin = draftService.isUserAdmin(parseInt(userId));
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
        message: 'Only Rupert can access simulation features'
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

const router = express.Router();
const draftService = new DraftService();
const fplService = new FPLApiService();

// Initialize services
await draftService.initialize();

/**
 * POST /api/draft/login
 * Simple user authentication for draft league
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password required'
      });
    }

    const user = await draftService.authenticateUser(username, password);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username,
        isAdmin: user.isAdmin || false
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Log user login activity
    const sessionId = `session_${Date.now()}_${user.id}`;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    await activityLogger.logLogin(user.id, user.username, sessionId, ipAddress, userAgent);

    res.json({
      success: true,
      user,
      token,
      sessionId,
      message: `Welcome ${user.username}!`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/draft/logout
 * User logout
 */
router.post('/logout', async (req, res) => {
  try {
    const { userId, sessionId } = req.body;
    
    if (!userId || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'User ID and session ID required'
      });
    }

    // Log user logout activity
    const user = draftService.getUserById(parseInt(userId));
    if (user) {
      activityLogger.logLogout(user.id, user.username, sessionId);
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/draft/status
 * Get current draft status and user teams
 */
router.get('/status', async (req, res) => {
  try {
    const status = draftService.getDraftStatus();
    
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Removed duplicate endpoint - using the one below that returns ALL Chelsea players

/**
 * POST /api/draft/pick-player
 * Draft a player for a user
 */
router.post('/pick-player', async (req, res) => {
  try {
    const { userId, playerId } = req.body;
    
    if (!userId || !playerId) {
      return res.status(400).json({
        success: false,
        error: 'User ID and Player ID required'
      });
    }

    // Get player data for validation
    const bootstrap = await fplService.getBootstrapStatic();
    const player = bootstrap.elements.find(p => p.id === parseInt(playerId));
    
    if (!player) {
      return res.status(404).json({
        success: false,
        error: 'Player not found'
      });
    }

    // Check if player is from Chelsea
    if (player.team !== 7) {
      return res.status(400).json({
        success: false,
        error: 'Only Chelsea players can be drafted'
      });
    }

    const result = await draftService.draftPlayer(parseInt(userId), parseInt(playerId), player);
    
    res.json({
      success: true,
      data: result,
      player: {
        id: player.id,
        name: player.web_name,
        position: player.element_type
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/draft/remove-player
 * Remove a player from user's team (only after draft is complete)
 */
router.post('/remove-player', async (req, res) => {
  try {
    const { userId, playerId } = req.body;
    
    if (!userId || !playerId) {
      return res.status(400).json({
        success: false,
        error: 'User ID and Player ID required'
      });
    }

    const result = await draftService.removePlayer(parseInt(userId), parseInt(playerId));
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/draft/user/:userId
 * Get specific user's team and details
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const user = draftService.getUserById(parseInt(userId));
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get player details for the team
    const bootstrap = await fplService.getBootstrapStatic();
    const teamWithDetails = user.team.map(playerId => {
      const player = bootstrap.elements.find(p => p.id === playerId);
      const position = bootstrap.element_types.find(pos => pos.id === player?.element_type);
      
      return {
        id: playerId,
        name: player?.web_name || 'Unknown',
        position: position?.singular_name_short || 'UNK',
        element_type: player?.element_type,
        total_points: player?.total_points || 0
      };
    });
    
    res.json({
      success: true,
      data: {
        ...user,
        teamDetails: teamWithDetails
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/draft/live-scores
 * Get live scores for all teams
 */
router.get('/live-scores', async (req, res) => {
  try {
    const currentGameweek = await fplService.getCurrentGameweek();
    const liveData = await fplService.getGameweekLiveData(currentGameweek).catch(() => null);
    
    const teamScores = draftService.calculateTeamScores(liveData);
    
    // Enrich with player names
    const bootstrap = await fplService.getBootstrapStatic();
    const enrichedScores = teamScores.map(team => ({
      ...team,
      playerScores: team.playerScores.map(ps => {
        const player = bootstrap.elements.find(p => p.id === ps.playerId);
        return {
          ...ps,
          playerName: player?.web_name || 'Unknown',
          position: bootstrap.element_types.find(pos => pos.id === player?.element_type)?.singular_name_short || 'UNK'
        };
      })
    }));
    
    res.json({
      success: true,
      data: {
        gameweek: currentGameweek,
        teamScores: enrichedScores,
        lastUpdated: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/draft/reset
 * Reset the draft (for testing/new seasons)
 */
router.post('/reset', async (req, res) => {
  try {
    const result = await draftService.resetDraft();
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/draft/formation-rules
 * Get formation rules and validation info
 */
router.get('/formation-rules', (req, res) => {
  res.json({
    success: true,
    data: {
      teamSize: 5,
      maxDefenders: 2, // GK + DEF
      maxAttackers: 3, // MID + FWD
      positions: {
        1: { name: 'Goalkeeper', short: 'GK', category: 'defender' },
        2: { name: 'Defender', short: 'DEF', category: 'defender' },
        3: { name: 'Midfielder', short: 'MID', category: 'attacker' },
        4: { name: 'Forward', short: 'FWD', category: 'attacker' }
      },
      rules: [
        'Each team must have exactly 5 players',
        'Maximum 2 Goalkeepers + Defenders combined',
        'Maximum 3 Midfielders + Forwards combined',
        'Only Chelsea players are allowed',
        'Each player can only be owned by one user'
      ]
    },
    timestamp: new Date().toISOString()
  });
});

// Transfer system
router.post('/transfer', async (req, res) => {
  try {
    const { userId, playerOutId, playerInId } = req.body;
    
    if (!userId || !playerOutId || !playerInId) {
      return res.status(400).json({
        success: false,
        error: 'userId, playerOutId, and playerInId are required'
      });
    }

    const result = await draftService.makeTransfer(parseInt(userId), parseInt(playerOutId), parseInt(playerInId));
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Set gameweek team (active players, bench, captain)
router.post('/set-gameweek-team', async (req, res) => {
  try {
    const { userId, activePlayers, benchedPlayer, captain } = req.body;
    
    if (!userId || !activePlayers || !benchedPlayer || !captain) {
      return res.status(400).json({
        success: false,
        error: 'userId, activePlayers, benchedPlayer, and captain are required'
      });
    }

    const result = await draftService.setGameweekTeam(
      parseInt(userId), 
      activePlayers.map(id => parseInt(id)), 
      parseInt(benchedPlayer), 
      parseInt(captain)
    );
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Set gameweek team error:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get gameweek team (returns current gameweek team, auto-setting default if not set)
router.get('/get-gameweek-team/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId is required'
      });
    }

    const teamData = await draftService.getGameweekTeam(parseInt(userId));
    
    res.json({
      success: true,
      data: teamData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get gameweek team error:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get available Chelsea players for transfers
router.get('/available-players', async (req, res) => {
  try {
    const bootstrap = await fplService.getBootstrapStatic();
    const chelseaPlayers = bootstrap.elements.filter(player => player.team === 7);
    const draftStatus = draftService.getDraftStatus();
    
    // Filter out already drafted players
    const draftedPlayers = draftStatus.draftedPlayers || [];
    const availablePlayers = chelseaPlayers.filter(player => 
      !draftedPlayers.includes(player.id)
    );
    
    // Enrich with position names
    const playersWithPositions = availablePlayers.map(player => {
      const position = bootstrap.element_types.find(pos => pos.id === player.element_type);
      return {
        ...player,
        position_name: position?.singular_name || 'Unknown',
        position_short: position?.singular_name_short || 'UNK',
        price: (player.now_cost / 10).toFixed(1)
      };
    });
    
    res.json({
      success: true,
      data: playersWithPositions,
      count: playersWithPositions.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get available players error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Chip system routes
router.post('/give-chip', async (req, res) => {
  try {
    const { userId, chipData } = req.body;
    
    if (!userId || !chipData) {
      return res.status(400).json({
        success: false,
        error: 'userId and chipData are required'
      });
    }

    const result = await draftService.giveChipToUser(parseInt(userId), chipData);
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Give chip error:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.post('/use-chip', async (req, res) => {
  try {
    const { userId, chipId, targetUserId, additionalData } = req.body;
    
    if (!userId || !chipId) {
      return res.status(400).json({
        success: false,
        error: 'userId and chipId are required'
      });
    }

    const result = await draftService.useChip(
      parseInt(userId), 
      chipId, 
      targetUserId ? parseInt(targetUserId) : null, 
      additionalData || {}
    );
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Use chip error:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/chip-history', async (req, res) => {
  try {
    const draftStatus = draftService.getDraftStatus();
    
    res.json({
      success: true,
      data: {
        chipHistory: draftStatus.chipHistory || [],
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Get chip history error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Chip system management routes
router.post('/process-gameweek-chips', async (req, res) => {
  try {
    const { gameweek } = req.body;
    
    if (!gameweek) {
      return res.status(400).json({
        success: false,
        error: 'gameweek is required'
      });
    }

    // Import ChipService dynamically to avoid circular imports
    const { ChipService } = await import('../services/chipService.js');
    const chipService = new ChipService(draftService);
    await chipService.initialize();

    const result = await chipService.processGameweekChips(parseInt(gameweek));
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Process gameweek chips error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.post('/simulate-chip-drop', requireAdmin, async (req, res) => {
  try {
    const { gameweek } = req.body;
    
    if (!gameweek) {
      return res.status(400).json({
        success: false,
        error: 'gameweek is required'
      });
    }

    const { ChipService } = await import('../services/chipService.js');
    const chipService = new ChipService(draftService);
    await chipService.initialize();

    const result = await chipService.simulateChipDropsForGameweek(parseInt(gameweek));
    
    res.json({
      success: true,
      data: result,
      message: 'Chip simulation completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Simulate chip drop error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/chip-statistics', async (req, res) => {
  try {
    const { ChipService } = await import('../services/chipService.js');
    const chipService = new ChipService(draftService);
    
    const stats = chipService.getChipStatistics();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get chip statistics error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get all Chelsea players for frontend
router.get('/chelsea-players', async (req, res) => {
  try {
    const bootstrap = await fplService.getBootstrapStatic();
    const chelseaPlayers = bootstrap.elements.filter(player => player.team === 7);
    
    // Enrich with position names
    const playersWithPositions = chelseaPlayers.map(player => {
      const position = bootstrap.element_types.find(pos => pos.id === player.element_type);
      return {
        ...player,
        position_name: position?.singular_name || 'Unknown',
        position_short: position?.singular_name_short || 'UNK',
        price: (player.now_cost / 10).toFixed(1)
      };
    });
    
    res.json({
      success: true,
      data: playersWithPositions,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get Chelsea players error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Simulation routes
router.post('/simulation/randomize-teams', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    const user = draftService.getUserById(parseInt(userId));
    
    const { SimulationService } = await import('../services/simulationService.js');
    const simulationService = new SimulationService(draftService); // Pass existing instance
    await simulationService.initialize();

    const result = await simulationService.randomizeAllTeams();
    
    // Log simulation action
    if (user) {
      activityLogger.logSimulationAction(user.id, user.username, 'RANDOMIZE_TEAMS', {
        result: 'Teams randomized successfully',
        affectedUsers: result.affectedUsers || []
      });
    }
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Randomize teams error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.post('/simulation/simulate-gameweek', requireAdmin, async (req, res) => {
  try {
    const { gameweek, userId } = req.body;
    
    if (!gameweek) {
      return res.status(400).json({
        success: false,
        error: 'gameweek is required'
      });
    }

    const user = draftService.getUserById(parseInt(userId));
    
    const { SimulationService } = await import('../services/simulationService.js');
    const simulationService = new SimulationService(draftService);
    await simulationService.initialize();

    // Simulate the gameweek
    const simulationResult = await simulationService.simulateGameweek(parseInt(gameweek));
    
    // Automatically advance to the next gameweek after successful simulation
    const advanceResult = await simulationService.advanceGameweek();
    
    // Log simulation action
    if (user) {
      activityLogger.logSimulationAction(user.id, user.username, 'SIMULATE_GAMEWEEK', {
        gameweek: parseInt(gameweek),
        result: simulationResult,
        newGameweek: advanceResult.currentGameweek
      });
    }
    
    res.json({
      success: true,
      data: {
        simulation: simulationResult,
        advance: advanceResult
      },
      message: `Gameweek ${gameweek} simulated and advanced to gameweek ${advanceResult.currentGameweek}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Simulate gameweek error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.post('/simulation/advance-gameweek', requireAdmin, async (req, res) => {
  try {
    const { SimulationService } = await import('../services/simulationService.js');
    const simulationService = new SimulationService(draftService);
    await simulationService.initialize();

    const result = await simulationService.advanceGameweek();
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Advance gameweek error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/simulation/data', requireAdmin, async (req, res) => {
  try {
    const { SimulationService } = await import('../services/simulationService.js');
    const simulationService = new SimulationService(draftService);
    await simulationService.initialize();

    const data = simulationService.getSimulationData();
    
    res.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get simulation data error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.get('/simulation/leaderboard', requireAdmin, async (req, res) => {
  try {
    const { SimulationService } = await import('../services/simulationService.js');
    const simulationService = new SimulationService(draftService);
    await simulationService.initialize();

    const leaderboard = simulationService.getOverallLeaderboard();
    
    res.json({
      success: true,
      data: leaderboard,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get simulation leaderboard error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

router.post('/simulation/reset', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    const user = draftService.getUserById(parseInt(userId));
    
    const { SimulationService } = await import('../services/simulationService.js');
    const simulationService = new SimulationService(draftService);
    await simulationService.initialize();

    const result = await simulationService.resetSimulation();
    
    // Log simulation action
    if (user) {
      activityLogger.logSimulationAction(user.id, user.username, 'RESET_SIMULATION', {
        result: 'Simulation reset successfully',
        previousGameweek: result.previousGameweek || null
      });
    }
    
    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Reset simulation error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Sync gameweek with FPL API
router.post('/sync-gameweek', async (req, res) => {
  try {
    const { DraftService } = await import('../services/draftService.js');
    const draftService = new DraftService();
    await draftService.initialize();
    
    // Force sync with FPL gameweek
    await draftService.syncWithFPLGameweek();
    
    const status = draftService.getDraftStatus();
    
    res.json({
      success: true,
      data: {
        currentGameweek: status.currentGameweek,
        currentTransferUser: status.currentTransferUser
      },
      message: `Synced to FPL gameweek ${status.currentGameweek}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sync gameweek error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Toggle simulation mode
router.post('/toggle-simulation-mode', requireAdmin, async (req, res) => {
  try {
    const { enable } = req.body;
    
    const { DraftService } = await import('../services/draftService.js');
    const draftService = new DraftService();
    await draftService.initialize();
    
    const newMode = await draftService.toggleSimulationMode(enable);
    const status = draftService.getDraftStatus();
    
    res.json({
      success: true,
      data: {
        simulationMode: newMode,
        currentGameweek: status.currentGameweek,
        realGameweek: status.realGameweek
      },
      message: `Simulation mode ${newMode ? 'enabled' : 'disabled'}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Toggle simulation mode error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Advance simulation gameweek
router.post('/advance-simulation-gameweek', requireAdmin, async (req, res) => {
  try {
    const { DraftService } = await import('../services/draftService.js');
    const draftService = new DraftService();
    await draftService.initialize();
    
    const newGameweek = await draftService.advanceSimulationGameweek();
    
    res.json({
      success: true,
      data: {
        currentGameweek: newGameweek
      },
      message: `Advanced to gameweek ${newGameweek}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Advance simulation gameweek error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get gameweek deadline information
router.get('/deadline', async (req, res) => {
  try {
    const { gameweek } = req.query;
    const gameweekId = gameweek ? parseInt(gameweek) : null;
    
    const { FPLApiService } = await import('../services/fplApiService.js');
    const fplService = new FPLApiService();
    await fplService.initialize();
    
    const deadlineInfo = await fplService.getGameweekDeadline(gameweekId);
    
    if (!deadlineInfo) {
      return res.status(404).json({
        success: false,
        error: 'Deadline information not found',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      data: deadlineInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get deadline error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Generate funny deadline summary
router.get('/deadline-summary', async (req, res) => {
  try {
    const { gameweek } = req.query;
    const gameweekId = gameweek ? parseInt(gameweek) : null;
    
    const { DraftService } = await import('../services/draftService.js');
    const draftService = new DraftService();
    await draftService.initialize();
    
    const { SummaryService } = await import('../services/summaryService.js');
    const summaryService = new SummaryService();
    
    const draftData = draftService.getDraftData();
    const summary = summaryService.generateDeadlineSummary(draftData, gameweekId);
    
    if (summary.error) {
      return res.status(500).json({
        success: false,
        error: summary.error,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      data: {
        summary: summary,
        formatted: summaryService.formatSummaryForDisplay(summary),
        gameweek: gameweekId
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Generate deadline summary error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;

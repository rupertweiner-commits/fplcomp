import express from 'express';
import { draftQueueService } from '../services/draftQueueService.js';
import { activityLogger } from '../services/activityLoggerService.js';

const router = express.Router();

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({
      success: false,
      error: 'User ID required for admin operations'
    });
  }
  
  // This would check against your user service
  // For now, we'll assume Rupert (userId: 3) is admin
  if (parseInt(userId) !== 3) {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  
  next();
};

// Get current draft status
router.get('/status', (req, res) => {
  try {
    const status = draftQueueService.getStatusSummary();
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get draft status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get draft status'
    });
  }
});

// Get draft progress
router.get('/progress', (req, res) => {
  try {
    const progress = draftQueueService.getDraftProgress();
    res.json({
      success: true,
      data: progress,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get draft progress:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get draft progress'
    });
  }
});

// Get current player's turn
router.get('/current-turn', (req, res) => {
  try {
    const currentPlayer = draftQueueService.getCurrentPlayer();
    const nextPlayer = draftQueueService.getNextPlayer();
    
    res.json({
      success: true,
      data: {
        currentPlayer,
        nextPlayer,
        timeRemaining: currentPlayer?.timeRemaining || 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get current turn:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current turn'
    });
  }
});

// Initialize draft (admin only)
router.post('/initialize', requireAdmin, async (req, res) => {
  try {
    const { users, draftOrder } = req.body;
    
    if (!users || !Array.isArray(users)) {
      return res.status(400).json({
        success: false,
        error: 'Users array is required'
      });
    }

    const success = draftQueueService.initializeDraft(users, draftOrder);
    
    if (success) {
      // Log draft initialization
      await activityLogger.logActivity(req.body.userId, 'ADMIN', 'DRAFT_INITIALIZED', {
        totalUsers: users.length,
        draftOrder: draftOrder || 'random'
      });

      res.json({
        success: true,
        message: 'Draft initialized successfully',
        data: draftQueueService.getStatusSummary(),
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to initialize draft'
      });
    }
  } catch (error) {
    console.error('Failed to initialize draft:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize draft'
    });
  }
});

// Start draft (admin only)
router.post('/start', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    
    const firstPlayer = draftQueueService.startDraft();
    
    if (firstPlayer) {
      // Log draft start
      await activityLogger.logActivity(userId, 'ADMIN', 'DRAFT_STARTED', {
        firstPlayer: firstPlayer.username,
        totalPlayers: draftQueueService.getDraftProgress().totalPicks
      });

      res.json({
        success: true,
        message: 'Draft started successfully',
        data: {
          firstPlayer,
          status: draftQueueService.getStatusSummary()
        },
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to start draft'
      });
    }
  } catch (error) {
    console.error('Failed to start draft:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to start draft'
    });
  }
});

// Make a pick
router.post('/pick', async (req, res) => {
  try {
    const { userId, playerData } = req.body;
    
    if (!userId || !playerData) {
      return res.status(400).json({
        success: false,
        error: 'User ID and player data are required'
      });
    }

    const result = await draftQueueService.makePick(userId, playerData);
    
    res.json({
      success: true,
      message: 'Pick made successfully',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to make pick:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to make pick'
    });
  }
});

// Pause draft (admin only)
router.post('/pause', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    
    const success = draftQueueService.pauseDraft();
    
    if (success) {
      // Log draft pause
      await activityLogger.logActivity(userId, 'ADMIN', 'DRAFT_PAUSED', {
        pausedAt: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'Draft paused successfully',
        data: draftQueueService.getStatusSummary(),
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to pause draft'
      });
    }
  } catch (error) {
    console.error('Failed to pause draft:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to pause draft'
    });
  }
});

// Resume draft (admin only)
router.post('/resume', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    
    const success = draftQueueService.resumeDraft();
    
    if (success) {
      // Log draft resume
      await activityLogger.logActivity(userId, 'ADMIN', 'DRAFT_RESUMED', {
        resumedAt: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'Draft resumed successfully',
        data: draftQueueService.getStatusSummary(),
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Failed to resume draft'
      });
    }
  } catch (error) {
    console.error('Failed to resume draft:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to resume draft'
    });
  }
});

// Skip player turn (admin only)
router.post('/skip-turn', requireAdmin, async (req, res) => {
  try {
    const { userId, targetUserId, reason } = req.body;
    
    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'Target user ID is required'
      });
    }

    const result = await draftQueueService.skipPlayerTurn(targetUserId, reason);
    
    res.json({
      success: true,
      message: 'Turn skipped successfully',
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to skip turn:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to skip turn'
    });
  }
});

// Reset draft (admin only)
router.post('/reset', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.body;
    
    const success = draftQueueService.resetDraft();
    
    if (success) {
      // Log draft reset
      await activityLogger.logActivity(userId, 'ADMIN', 'DRAFT_RESET', {
        resetAt: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'Draft reset successfully',
        data: draftQueueService.getStatusSummary(),
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to reset draft'
      });
    }
  } catch (error) {
    console.error('Failed to reset draft:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset draft'
    });
  }
});

// Get draft results
router.get('/results', (req, res) => {
  try {
    const results = draftQueueService.getDraftResults();
    res.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get draft results:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get draft results'
    });
  }
});

// Update player online status
router.post('/player-status', (req, res) => {
  try {
    const { userId, isOnline } = req.body;
    
    if (userId === undefined || isOnline === undefined) {
      return res.status(400).json({
        success: false,
        error: 'User ID and online status are required'
      });
    }

    draftQueueService.updatePlayerStatus(userId, isOnline);
    
    res.json({
      success: true,
      message: 'Player status updated',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to update player status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update player status'
    });
  }
});

// Get player by ID
router.get('/player/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const player = draftQueueService.getPlayerById(parseInt(userId));
    
    if (player) {
      res.json({
        success: true,
        data: player,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Player not found'
      });
    }
  } catch (error) {
    console.error('Failed to get player:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get player'
    });
  }
});

// Get draft queue (full list)
router.get('/queue', (req, res) => {
  try {
    const queue = draftQueueService.draftQueue;
    res.json({
      success: true,
      data: queue,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get draft queue:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get draft queue'
    });
  }
});

export default router;


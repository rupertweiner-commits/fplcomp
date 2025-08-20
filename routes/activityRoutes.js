import express from 'express';
import { activityLogger } from '../services/activityLoggerService.js';
import { DraftService } from '../services/draftService.js';

const router = express.Router();
const draftService = new DraftService();

// Admin authentication middleware
const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.query.userId || req.body.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID required for admin operations'
      });
    }

    const isAdmin = draftService.isUserAdmin(parseInt(userId));
    
    if (!isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * GET /api/activity/user/:userId/summary
 * Get activity summary for a specific user
 */
router.get('/user/:userId/summary', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const days = parseInt(req.query.days) || 30;
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    const summary = activityLogger.getUserActivitySummary(userId, days);
    
    res.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/activity/user/:userId/recent
 * Get recent activity for a specific user
 */
router.get('/user/:userId/recent', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = parseInt(req.query.limit) || 20;
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    const activity = activityLogger.getUserRecentActivity(userId, limit);
    
    res.json({
      success: true,
      data: activity,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/activity/stats
 * Get overall activity statistics (admin only)
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const stats = activityLogger.getActivityStats(days);
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/activity/sessions
 * Get user session statistics (admin only)
 */
router.get('/sessions', requireAdmin, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const stats = activityLogger.getUserSessionStats(days);
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/activity/all
 * Get all activity logs (admin only)
 */
router.get('/all', requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    const activity = activityLogger.getAllActivity(limit, offset);
    
    res.json({
      success: true,
      data: activity,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/activity/cleanup
 * Clean up old activity logs (admin only)
 */
router.post('/cleanup', requireAdmin, async (req, res) => {
  try {
    const cleanedCount = activityLogger.cleanupOldLogs();
    
    res.json({
      success: true,
      message: `Cleaned up ${cleanedCount} old activity logs`,
      cleanedCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/activity/types
 * Get list of all activity types
 */
router.get('/types', async (req, res) => {
  try {
    const activityTypes = [
      'LOGIN',
      'LOGOUT',
      'TRANSFER',
      'CHIP_USED',
      'CAPTAIN_CHANGE',
      'BENCH_CHANGE',
      'FORMATION_CHANGE',
      'SIMULATION_ACTION',
      'PROFILE_CHANGE'
    ];
    
    res.json({
      success: true,
      data: activityTypes,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;

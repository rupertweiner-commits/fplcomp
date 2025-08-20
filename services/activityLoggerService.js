import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ActivityLoggerService {
  constructor() {
    this.dbPath = path.join(__dirname, '../data/user_activity.db');
    this.db = null;
    // Initialize asynchronously
    this.initPromise = this.initialize().catch(error => {
      console.error('Failed to initialize Activity Logger Service:', error);
    });
  }

  async initialize() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath);
      
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      this.db = new Database(this.dbPath);
      await this.createTables();
      console.log('✅ Activity Logger Service initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Activity Logger Service:', error);
      return false;
    }
  }

  async createTables() {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    // User Activity table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        action_type TEXT NOT NULL,
        action_details TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        user_agent TEXT,
        session_id TEXT
      )
    `);

    // User Sessions table for tracking login/logout
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        username TEXT NOT NULL,
        session_id TEXT UNIQUE NOT NULL,
        login_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        logout_timestamp DATETIME,
        ip_address TEXT,
        user_agent TEXT,
        is_active BOOLEAN DEFAULT 1
      )
    `);

    // Create indexes for better performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON user_activity(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_activity_action_type ON user_activity(action_type);
      CREATE INDEX IF NOT EXISTS idx_user_activity_timestamp ON user_activity(timestamp);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
    `);
  }

  // Log user login
  async logLogin(userId, username, sessionId, ipAddress = null, userAgent = null) {
    try {
      // Wait for initialization
      await this.initPromise;
      
      if (!this.db) {
        console.error('Database not initialized');
        return false;
      }

      const stmt = this.db.prepare(`
        INSERT INTO user_sessions (user_id, username, session_id, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      stmt.run(userId, username, sessionId, ipAddress, userAgent);

      // Also log as activity
      await this.logActivity(userId, username, 'LOGIN', {
        sessionId,
        ipAddress,
        userAgent
      });

      return true;
    } catch (error) {
      console.error('Failed to log login:', error);
      return false;
    }
  }

  // Log user logout
  async logLogout(userId, username, sessionId) {
    try {
      // Wait for initialization
      await this.initPromise;
      
      if (!this.db) {
        console.error('Database not initialized');
        return false;
      }

      // Update session to inactive
      const stmt = this.db.prepare(`
        UPDATE user_sessions 
        SET logout_timestamp = CURRENT_TIMESTAMP, is_active = 0
        WHERE session_id = ? AND user_id = ?
      `);
      
      stmt.run(sessionId, userId);

      // Log as activity
      await this.logActivity(userId, username, 'LOGOUT', { sessionId });

      return true;
    } catch (error) {
      console.error('Failed to log logout:', error);
      return false;
    }
  }

  // Log player transfers
  logTransfer(userId, username, playerId, playerName, transferType, previousTeam = null) {
    try {
      this.logActivity(userId, username, 'TRANSFER', {
        playerId,
        playerName,
        transferType, // 'IN' or 'OUT'
        previousTeam
      });
      return true;
    } catch (error) {
      console.error('Failed to log transfer:', error);
      return false;
    }
  }

  // Log chip usage
  logChipUsage(userId, username, chipId, chipName, chipDescription, targetUserId = null) {
    try {
      this.logActivity(userId, username, 'CHIP_USED', {
        chipId,
        chipName,
        chipDescription,
        targetUserId
      });
      return true;
    } catch (error) {
      console.error('Failed to log chip usage:', error);
      return false;
    }
  }

  // Log captain changes
  logCaptainChange(userId, username, previousCaptainId, previousCaptainName, newCaptainId, newCaptainName) {
    try {
      this.logActivity(userId, username, 'CAPTAIN_CHANGE', {
        previousCaptainId,
        previousCaptainName,
        newCaptainId,
        newCaptainName
      });
      return true;
    } catch (error) {
      console.error('Failed to log captain change:', error);
      return false;
    }
  }

  // Log bench changes
  logBenchChange(userId, username, playerId, playerName, changeType) {
    try {
      this.logActivity(userId, username, 'BENCH_CHANGE', {
        playerId,
        playerName,
        changeType // 'BENCHED' or 'ACTIVATED'
      });
      return true;
    } catch (error) {
      console.error('Failed to log bench change:', error);
      return false;
    }
  }

  // Log team formation changes
  logFormationChange(userId, username, previousFormation, newFormation, reason = null) {
    try {
      this.logActivity(userId, username, 'FORMATION_CHANGE', {
        previousFormation,
        newFormation,
        reason
      });
      return true;
    } catch (error) {
      console.error('Failed to log formation change:', error);
      return false;
    }
  }

  // Log simulation actions (admin only)
  logSimulationAction(userId, username, actionType, actionDetails) {
    try {
      this.logActivity(userId, username, 'SIMULATION_ACTION', {
        actionType,
        ...actionDetails
      });
      return true;
    } catch (error) {
      console.error('Failed to log simulation action:', error);
      return false;
    }
  }

  // Log profile changes
  logProfileChange(userId, username, changeType, changeDetails) {
    try {
      this.logActivity(userId, username, 'PROFILE_CHANGE', {
        changeType,
        ...changeDetails
      });
      return true;
    } catch (error) {
      console.error('Failed to log profile change:', error);
      return false;
    }
  }

  // Generic activity logging method
  async logActivity(userId, username, actionType, actionDetails = null, ipAddress = null, userAgent = null, sessionId = null) {
    try {
      // Wait for initialization
      await this.initPromise;
      
      if (!this.db) {
        console.error('Database not initialized');
        return false;
      }

      const stmt = this.db.prepare(`
        INSERT INTO user_activity (user_id, username, action_type, action_details, ip_address, user_agent, session_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const details = actionDetails ? JSON.stringify(actionDetails) : null;
      stmt.run(userId, username, actionType, details, ipAddress, userAgent, sessionId);
      
      return true;
    } catch (error) {
      console.error('Failed to log activity:', error);
      return false;
    }
  }

  // Get user activity summary
  async getUserActivitySummary(userId, days = 30) {
    try {
      await this.initPromise;
      
      if (!this.db) {
        console.error('Database not initialized');
        return [];
      }

      const stmt = this.db.prepare(`
        SELECT 
          action_type,
          COUNT(*) as count,
          DATE(timestamp) as date
        FROM user_activity 
        WHERE user_id = ? 
        AND timestamp >= datetime('now', '-${days} days')
        GROUP BY action_type, DATE(timestamp)
        ORDER BY date DESC, count DESC
      `);
      
      return stmt.all(userId);
    } catch (error) {
      console.error('Failed to get user activity summary:', error);
      return [];
    }
  }

  // Get recent activity for a user
  async getUserRecentActivity(userId, limit = 20) {
    try {
      await this.initPromise;
      
      if (!this.db) {
        console.error('Database not initialized');
        return [];
      }

      const stmt = this.db.prepare(`
        SELECT 
          action_type,
          action_details,
          timestamp
        FROM user_activity 
        WHERE user_id = ? 
        ORDER BY timestamp DESC 
        LIMIT ?
      `);
      
      return stmt.all(userId, limit);
    } catch (error) {
      console.error('Failed to get user recent activity:', error);
      return [];
    }
  }

  // Get all activity for admin dashboard
  async getAllActivity(limit = 100, offset = 0) {
    try {
      await this.initPromise;
      
      if (!this.db) {
        console.error('Database not initialized');
        return [];
      }

      const stmt = this.db.prepare(`
        SELECT 
          ua.user_id,
          ua.username,
          ua.action_type,
          ua.action_details,
          ua.timestamp,
          ua.ip_address
        FROM user_activity ua
        ORDER BY ua.timestamp DESC 
        LIMIT ? OFFSET ?
      `);
      
      return stmt.all(limit, offset);
    } catch (error) {
      console.error('Failed to get all activity:', error);
      return [];
    }
  }

  // Get activity statistics
  async getActivityStats(days = 30) {
    try {
      await this.initPromise;
      
      if (!this.db) {
        console.error('Database not initialized');
        return [];
      }

      const stmt = this.db.prepare(`
        SELECT 
          action_type,
          COUNT(*) as total_count,
          COUNT(DISTINCT user_id) as unique_users,
          DATE(timestamp) as date
        FROM user_activity 
        WHERE timestamp >= datetime('now', '-${days} days')
        GROUP BY action_type, DATE(timestamp)
        ORDER BY date DESC, total_count DESC
      `);
      
      return stmt.all();
    } catch (error) {
      console.error('Failed to get activity stats:', error);
      return [];
    }
  }

  // Get user session statistics
  async getUserSessionStats(days = 30) {
    try {
      await this.initPromise;
      
      if (!this.db) {
        console.error('Database not initialized');
        return null;
      }

      const stmt = this.db.prepare(`
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(DISTINCT user_id) as unique_users,
          AVG(CAST((julianday(logout_timestamp) - julianday(login_timestamp)) * 24 * 60 AS INTEGER)) as avg_session_minutes
        FROM user_sessions 
        WHERE login_timestamp >= datetime('now', '-365 days')
        AND logout_timestamp IS NOT NULL
      `);
      
      return stmt.get();
    } catch (error) {
      console.error('Failed to get user session stats:', error);
      return null;
    }
  }

  // Clean up old activity logs (keep last 365 days)
  async cleanupOldLogs() {
    try {
      await this.initPromise;
      
      if (!this.db) {
        console.error('Database not initialized');
        return 0;
      }

      const stmt = this.db.prepare(`
        DELETE FROM user_activity 
        WHERE timestamp < datetime('now', '-365 days')
      `);
      
      const result = stmt.run();
      console.log(`Cleaned up ${result.changes} old activity logs`);
      return result.changes;
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
      return 0;
    }
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

export const activityLogger = new ActivityLoggerService();

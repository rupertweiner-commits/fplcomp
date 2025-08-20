import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export class DatabaseService {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.SUPABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('❌ Unexpected error on idle client', err);
      process.exit(-1);
    });

    this.isConnected = false;
  }

  async connect() {
    try {
      const client = await this.pool.connect();
      client.release();
      this.isConnected = true;
      console.log('✅ Database connection established');
      return true;
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  async query(text, params) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const start = Date.now();
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      // Log slow queries in development
      if (process.env.NODE_ENV === 'development' && duration > 100) {
        console.log(`🐌 Slow query (${duration}ms):`, text.substring(0, 100) + '...');
      }
      
      return res;
    } catch (error) {
      console.error('❌ Database query error:', error.message);
      console.error('Query:', text);
      console.error('Params:', params);
      throw error;
    }
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // User management methods
  async getUserById(userId) {
    const result = await this.query(
      'SELECT id, username, email, is_admin, profile_picture, created_at, updated_at, last_login FROM users WHERE id = $1 AND is_active = TRUE',
      [userId]
    );
    return result.rows[0] || null;
  }

  async getUserByUsername(username) {
    const result = await this.query(
      'SELECT id, username, email, is_admin, profile_picture, created_at, updated_at, last_login FROM users WHERE username = $1 AND is_active = TRUE',
      [username]
    );
    return result.rows[0] || null;
  }

  async getUserByEmail(email) {
    const result = await this.query(
      'SELECT id, username, email, is_admin, profile_picture, created_at, updated_at, last_login FROM users WHERE email = $1 AND is_active = TRUE',
      [email]
    );
    return result.rows[0] || null;
  }

  async updateUserPassword(userId, passwordHash) {
    const result = await this.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id',
      [passwordHash, userId]
    );
    return result.rows[0] || null;
  }

  async updateUserProfilePicture(userId, profilePicture) {
    const result = await this.query(
      'UPDATE users SET profile_picture = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id',
      [profilePicture, userId]
    );
    return result.rows[0] || null;
  }

  async updateUserLastLogin(userId) {
    const result = await this.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id',
      [userId]
    );
    return result.rows[0] || null;
  }

  // Team management methods
  async getUserTeam(userId) {
    const result = await this.query(`
      SELECT 
        ut.player_id,
        ut.is_active,
        ut.is_captain,
        ut.is_benched,
        ut.drafted_at
      FROM user_teams ut
      WHERE ut.user_id = $1
      ORDER BY ut.drafted_at
    `, [userId]);
    
    return result.rows;
  }

  async addPlayerToTeam(userId, playerId, isActive = true, isCaptain = false, isBenched = false) {
    const result = await this.query(`
      INSERT INTO user_teams (user_id, player_id, is_active, is_captain, is_benched)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, player_id) DO UPDATE SET
        is_active = EXCLUDED.is_active,
        is_captain = EXCLUDED.is_captain,
        is_benched = EXCLUDED.is_benched
      RETURNING id
    `, [userId, playerId, isActive, isCaptain, isBenched]);
    
    return result.rows[0];
  }

  async removePlayerFromTeam(userId, playerId) {
    const result = await this.query(
      'DELETE FROM user_teams WHERE user_id = $1 AND player_id = $2 RETURNING id',
      [userId, playerId]
    );
    return result.rows[0];
  }

  async updatePlayerStatus(userId, playerId, updates) {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 3}`)
      .join(', ');
    
    const values = [userId, playerId, ...Object.values(updates)];
    
    const result = await this.query(`
      UPDATE user_teams 
      SET ${setClause}
      WHERE user_id = $1 AND player_id = $2
      RETURNING id
    `, values);
    
    return result.rows[0];
  }

  // Draft management methods
  async getDraftData() {
    const result = await this.query('SELECT * FROM draft_data WHERE id = 1');
    return result.rows[0] || null;
  }

  async updateDraftData(updates) {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');
    
    const values = Object.values(updates);
    
    const result = await this.query(`
      UPDATE draft_data 
      SET ${setClause}, last_updated = CURRENT_TIMESTAMP
      WHERE id = 1
      RETURNING *
    `, values);
    
    return result.rows[0];
  }

  async getDraftedPlayers() {
    const result = await this.query(`
      SELECT 
        dp.player_id,
        dp.user_id,
        dp.draft_position,
        dp.drafted_at,
        u.username
      FROM drafted_players dp
      JOIN users u ON dp.user_id = u.id
      ORDER BY dp.draft_position
    `);
    
    return result.rows;
  }

  async addDraftedPlayer(playerId, userId, draftPosition) {
    const result = await this.query(`
      INSERT INTO drafted_players (player_id, user_id, draft_position)
      VALUES ($1, $2, $3)
      ON CONFLICT (player_id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        draft_position = EXCLUDED.draft_position
      RETURNING id
    `, [playerId, userId, draftPosition]);
    
    return result.rows[0];
  }

  // Transfer management methods
  async getTransfers(userId = null, gameweek = null) {
    let query = `
      SELECT 
        t.id,
        t.user_id,
        t.player_in_id,
        t.player_out_id,
        t.transfer_type,
        t.gameweek,
        t.created_at,
        u.username
      FROM transfers t
      JOIN users u ON t.user_id = u.id
    `;
    
    const params = [];
    const conditions = [];
    
    if (userId) {
      conditions.push(`t.user_id = $${params.length + 1}`);
      params.push(userId);
    }
    
    if (gameweek) {
      conditions.push(`t.gameweek = $${params.length + 1}`);
      params.push(gameweek);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ' ORDER BY t.created_at DESC';
    
    const result = await this.query(query, params);
    return result.rows;
  }

  async addTransfer(userId, playerInId, playerOutId = null, transferType = 'IN', gameweek = null) {
    const result = await this.query(`
      INSERT INTO transfers (user_id, player_in_id, player_out_id, transfer_type, gameweek)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [userId, playerInId, playerOutId, transferType, gameweek]);
    
    return result.rows[0];
  }

  // Chip usage methods
  async getChipUsage(userId = null, gameweek = null) {
    let query = `
      SELECT 
        c.id,
        c.user_id,
        c.chip_type,
        c.gameweek,
        c.used_at,
        u.username
      FROM chip_usage c
      JOIN users u ON c.user_id = u.id
    `;
    
    const params = [];
    const conditions = [];
    
    if (userId) {
      conditions.push(`c.user_id = $${params.length + 1}`);
      params.push(userId);
    }
    
    if (gameweek) {
      conditions.push(`c.gameweek = $${params.length + 1}`);
      params.push(gameweek);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ' ORDER BY c.used_at DESC';
    
    const result = await this.query(query, params);
    return result.rows;
  }

  async addChipUsage(userId, chipType, gameweek) {
    const result = await this.query(`
      INSERT INTO chip_usage (user_id, chip_type, gameweek)
      VALUES ($1, $2, $3)
      RETURNING id
    `, [userId, chipType, gameweek]);
    
    return result.rows[0];
  }

  // Activity logging methods
  async logActivity(userId, username, actionType, actionDetails = null, ipAddress = null, userAgent = null, sessionId = null) {
    const result = await this.query(`
      INSERT INTO user_activity (user_id, username, action_type, action_details, ip_address, user_agent, session_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [userId, username, actionType, actionDetails ? JSON.stringify(actionDetails) : null, ipAddress, userAgent, sessionId]);
    
    return result.rows[0];
  }

  async logLogin(userId, username, sessionId, ipAddress = null, userAgent = null) {
    // Log to sessions table
    const sessionResult = await this.query(`
      INSERT INTO user_sessions (user_id, username, session_id, ip_address, user_agent)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [userId, username, sessionId, ipAddress, userAgent]);
    
    // Also log as activity
    await this.logActivity(userId, username, 'LOGIN', { sessionId }, ipAddress, userAgent, sessionId);
    
    // Update last login
    await this.updateUserLastLogin(userId);
    
    return sessionResult.rows[0];
  }

  async logLogout(userId, sessionId) {
    // Update session
    await this.query(`
      UPDATE user_sessions 
      SET logout_timestamp = CURRENT_TIMESTAMP, is_active = FALSE
      WHERE session_id = $1
    `, [sessionId]);
    
    // Log activity
    await this.logActivity(userId, null, 'LOGOUT', { sessionId });
  }

  // Activity query methods
  async getUserActivitySummary(userId, days = 30) {
    const result = await this.query(`
      SELECT 
        action_type,
        COUNT(*) as count,
        DATE(timestamp) as date
      FROM user_activity 
      WHERE user_id = $1 
      AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
      GROUP BY action_type, DATE(timestamp)
      ORDER BY date DESC, count DESC
    `, [userId]);
    
    return result.rows;
  }

  async getUserRecentActivity(userId, limit = 20) {
    const result = await this.query(`
      SELECT 
        action_type,
        action_details,
        timestamp
      FROM user_activity 
      WHERE user_id = $1 
      ORDER BY timestamp DESC 
      LIMIT $2
    `, [userId, limit]);
    
    return result.rows;
  }

  async getAllActivity(limit = 100, offset = 0) {
    const result = await this.query(`
      SELECT 
        ua.user_id,
        ua.username,
        ua.action_type,
        ua.action_details,
        ua.timestamp,
        ua.ip_address
      FROM user_activity ua
      ORDER BY ua.timestamp DESC 
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    return result.rows;
  }

  async getActivityStats(days = 30) {
    const result = await this.query(`
      SELECT 
        action_type,
        COUNT(*) as total_count,
        COUNT(DISTINCT user_id) as unique_users,
        DATE(timestamp) as date
      FROM user_activity 
      WHERE timestamp >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
      GROUP BY action_type, DATE(timestamp)
      ORDER BY date DESC, total_count DESC
    `);
    
    return result.rows;
  }

  // Health check
  async healthCheck() {
    try {
      const result = await this.query('SELECT 1 as health');
      return result.rows[0]?.health === 1;
    } catch (error) {
      return false;
    }
  }

  // Close connections
  async close() {
    await this.pool.end();
    this.isConnected = false;
  }
}

export const databaseService = new DatabaseService();


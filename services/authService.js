import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { draftService } from './draftService.js';
import { activityLogger } from './activityLoggerService.js';

export class AuthService {
  constructor() {
    this.resetTokens = new Map(); // In production, use Redis/database
    this.resetTokenExpiry = 15 * 60 * 1000; // 15 minutes
    this.jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    this.jwtExpiry = '24h';
    this.refreshTokenExpiry = '7d';
  }

  // Generate secure reset token
  generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Create password reset token
  createPasswordResetToken(email) {
    const token = this.generateResetToken();
    const expiresAt = Date.now() + this.resetTokenExpiry;
    
    this.resetTokens.set(token, {
      email,
      expiresAt,
      used: false
    });

    // Clean up expired tokens
    this.cleanupExpiredTokens();

    return token;
  }

  // Validate reset token
  validateResetToken(token) {
    const resetData = this.resetTokens.get(token);
    
    if (!resetData) {
      return { valid: false, reason: 'Token not found' };
    }

    if (resetData.used) {
      return { valid: false, reason: 'Token already used' };
    }

    if (Date.now() > resetData.expiresAt) {
      this.resetTokens.delete(token);
      return { valid: false, reason: 'Token expired' };
    }

    return { valid: true, email: resetData.email };
  }

  // Use reset token
  useResetToken(token) {
    const resetData = this.resetTokens.get(token);
    if (resetData) {
      resetData.used = true;
      this.resetTokens.set(token, resetData);
    }
  }

  // Clean up expired tokens
  cleanupExpiredTokens() {
    const now = Date.now();
    for (const [token, data] of this.resetTokens.entries()) {
      if (now > data.expiresAt) {
        this.resetTokens.delete(token);
      }
    }
  }

  // Authenticate user
  async authenticateUser(username, password) {
    try {
      const user = await draftService.authenticateUser(username, password);
      if (user) {
        // Log successful login
        await activityLogger.logLogin(user.id, user.username, user.sessionId);
        return user;
      }
      return null;
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  }

  // Generate JWT token
  generateToken(user) {
    const payload = {
      userId: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };

    return jwt.sign(payload, this.jwtSecret);
  }

  // Generate refresh token
  generateRefreshToken(user) {
    const payload = {
      userId: user.id,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    };

    return jwt.sign(payload, this.jwtSecret);
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      return null;
    }
  }

  // Refresh JWT token
  refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtSecret);
      
      if (decoded.type !== 'refresh') {
        return null;
      }

      // Get user data
      const user = draftService.getUserById(decoded.userId);
      if (!user) {
        return null;
      }

      // Generate new tokens
      const newToken = this.generateToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      return {
        token: newToken,
        refreshToken: newRefreshToken,
        user: {
          id: user.id,
          username: user.username,
          isAdmin: user.isAdmin
        }
      };
    } catch (error) {
      return null;
    }
  }

  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = draftService.getUserById(userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Validate current password
      const isValid = await draftService.validatePassword(user.username, currentPassword);
      if (!isValid) {
        return { success: false, error: 'Current password is incorrect' };
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await draftService.updateUserPassword(userId, hashedPassword);

      // Log password change
      await activityLogger.logProfileChange(userId, user.username, 'PASSWORD_CHANGE', {
        changedAt: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Password change error:', error);
      return { success: false, error: 'Failed to change password' };
    }
  }

  // Reset password with token
  async resetPassword(token, newPassword) {
    try {
      const validation = this.validateResetToken(token);
      if (!validation.valid) {
        return { success: false, error: validation.reason };
      }

      const user = draftService.getUserByEmail(validation.email);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await draftService.updateUserPassword(user.id, hashedPassword);

      // Mark token as used
      this.useResetToken(token);

      // Log password reset
      await activityLogger.logProfileChange(user.id, user.username, 'PASSWORD_RESET', {
        resetAt: new Date().toISOString()
      });

      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: 'Failed to reset password' };
    }
  }

  // Logout user
  async logoutUser(userId, sessionId) {
    try {
      await activityLogger.logLogout(userId, sessionId);
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }
}

export const authService = new AuthService();

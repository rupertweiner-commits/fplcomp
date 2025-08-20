import express from 'express';
import multer from 'multer';
import path from 'path';
import { draftService } from '../services/draftService.js';
import { authService } from '../services/authService.js';
import { activityLogger } from '../services/activityLoggerService.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/profile-pictures/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Ensure upload directory exists
import fs from 'fs';
const uploadDir = 'uploads/profile-pictures/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * POST /api/auth/login
 * Authenticate using FPL session cookie
 */
router.post('/login', async (req, res) => {
  try {
    const { cookie } = req.body;
    
    if (!cookie) {
      return res.status(400).json({
        success: false,
        error: 'Session cookie is required',
        instructions: authService.getAuthenticationInstructions()
      });
    }

    // Set authentication headers
    authService.setAuthenticationCookie(cookie);
    
    // Verify authentication
    const authResult = await authService.verifyAuthentication();
    
    res.json({
      success: true,
      message: 'Authentication successful',
      data: authResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      instructions: authService.getAuthenticationInstructions()
    });
  }
});

/**
 * POST /api/auth/logout
 * Clear authentication
 */
router.post('/logout', (req, res) => {
  authService.clearAuthentication();
  
  res.json({
    success: true,
    message: 'Logged out successfully',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/auth/status
 * Check authentication status
 */
router.get('/status', async (req, res) => {
  try {
    if (!authService.isAuthenticated()) {
      return res.json({
        success: true,
        authenticated: false,
        message: 'Not authenticated',
        timestamp: new Date().toISOString()
      });
    }

    const testResult = await authService.testAuthentication();
    
    res.json({
      success: true,
      authenticated: testResult.success,
      managerId: authService.getAuthenticatedManagerId(),
      message: testResult.message,
      data: testResult.data,
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
 * GET /api/auth/my-team
 * Get authenticated manager's current team
 */
router.get('/my-team', async (req, res) => {
  try {
    if (!authService.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }

    const teamData = await authService.getMyTeam();
    
    res.json({
      success: true,
      data: teamData,
      managerId: authService.getAuthenticatedManagerId(),
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
 * GET /api/auth/my-transfers
 * Get authenticated manager's latest transfers
 */
router.get('/my-transfers', async (req, res) => {
  try {
    if (!authService.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }

    const transfersData = await authService.getMyTransfers();
    
    res.json({
      success: true,
      data: transfersData,
      managerId: authService.getAuthenticatedManagerId(),
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
 * GET /api/auth/my-data
 * Get authenticated manager's complete data
 */
router.get('/my-data', async (req, res) => {
  try {
    if (!authService.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }

    const managerData = await authService.getMyManagerData();
    
    res.json({
      success: true,
      data: managerData,
      managerId: authService.getAuthenticatedManagerId(),
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
 * GET /api/auth/instructions
 * Get authentication setup instructions
 */
router.get('/instructions', (req, res) => {
  res.json({
    success: true,
    data: authService.getAuthenticationInstructions(),
    timestamp: new Date().toISOString()
  });
});

/**
 * POST /api/auth/test
 * Test authentication with provided cookie without saving it
 */
router.post('/test', async (req, res) => {
  try {
    const { cookie } = req.body;
    
    if (!cookie) {
      return res.status(400).json({
        success: false,
        error: 'Session cookie is required for testing'
      });
    }

    // Create a temporary auth service instance for testing
    const testAuthService = new authService();
    testAuthService.setAuthenticationCookie(cookie);
    
    const testResult = await testAuthService.testAuthentication();
    
    res.json({
      success: true,
      testResult,
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

// Middleware to check authentication for protected routes
export const requireAuth = (req, res, next) => {
  if (!authService.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Please log in with your FPL session cookie',
      instructions: authService.getAuthenticationInstructions(),
      timestamp: new Date().toISOString()
    });
  }
  
  // Add auth service to request for use in other routes
  req.authService = authService;
  next();
};

// Get user profile
router.get('/profile/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        timestamp: new Date().toISOString()
      });
    }

    const profile = await draftService.getUserProfile(userId);
    
    res.json({
      success: true,
      data: profile,
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
 * PUT /api/auth/profile/:userId
 * Update user profile information
 */
router.put('/profile/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        timestamp: new Date().toISOString()
      });
    }

    const updates = req.body;
    const result = await draftService.updateProfile(userId, updates);
    
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

// Change user password
router.post('/profile/:userId/password', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        timestamp: new Date().toISOString()
      });
    }

    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required',
        timestamp: new Date().toISOString()
      });
    }

    const result = await draftService.changePassword(userId, currentPassword, newPassword);
    
    // Log profile change activity
    const user = await draftService.getUserById(userId);
    if (user) {
      activityLogger.logProfileChange(user.id, user.username, 'PASSWORD_CHANGE', {
        timestamp: new Date().toISOString()
      });
    }
    
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

// Change username
router.post('/profile/:userId/username', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        timestamp: new Date().toISOString()
      });
    }

    const { currentPassword, newUsername } = req.body;
    
    if (!currentPassword || !newUsername) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new username are required',
        timestamp: new Date().toISOString()
      });
    }

    const result = await draftService.changeUsername(userId, currentPassword, newUsername);
    
    // Log profile change activity
    const user = await draftService.getUserById(userId);
    if (user) {
      activityLogger.logProfileChange(user.id, user.username, 'USERNAME_CHANGE', {
        newUsername,
        timestamp: new Date().toISOString()
      });
    }
    
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

// Set initial password
router.post('/profile/:userId/initial-password', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        timestamp: new Date().toISOString()
      });
    }

    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({
        success: false,
        error: 'New password is required',
        timestamp: new Date().toISOString()
      });
    }

    const result = await draftService.setInitialPassword(userId, newPassword);
    
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
 * POST /api/auth/profile/:userId/picture
 * Upload profile picture
 */
router.post('/profile/:userId/picture', upload.single('profilePicture'), async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        timestamp: new Date().toISOString()
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Profile picture file is required',
        timestamp: new Date().toISOString()
      });
    }

    // Validate file
    await draftService.validateImageFile(req.file.buffer, req.file.originalname);
    
    // Update profile picture
    const result = await draftService.updateProfilePicture(
      userId, 
      req.file.buffer, 
      req.file.originalname
    );
    
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
 * GET /api/auth/profile/:userId/picture
 * Get profile picture
 */
router.get('/profile/:userId/picture', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        timestamp: new Date().toISOString()
      });
    }

    const pictureData = await draftService.getProfilePicture(userId);
    
    if (!pictureData) {
      return res.status(404).json({
        success: false,
        error: 'Profile picture not found',
        timestamp: new Date().toISOString()
      });
    }

    res.set('Content-Type', pictureData.contentType);
    res.set('Content-Disposition', `inline; filename="${pictureData.filename}"`);
    res.send(pictureData.buffer);
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * DELETE /api/auth/profile/:userId/picture
 * Delete profile picture
 */
router.delete('/profile/:userId/picture', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
        timestamp: new Date().toISOString()
      });
    }

    const result = await draftService.deleteProfilePicture(userId);
    
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

// 🔐 **PASSWORD RESET ROUTES (CRITICAL SECURITY FEATURE)**

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Check if user exists
    const user = draftService.getUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists or not (security best practice)
      return res.json({ 
        success: true, 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    // Generate reset token
    const resetToken = authService.createPasswordResetToken(email);

    // In production, send email here
    // For now, return the token (this is NOT secure for production!)
    console.log(`🔐 Password reset token for ${email}: ${resetToken}`);

    // Log password reset request
    await activityLogger.logProfileChange(user.id, user.username, 'PASSWORD_RESET_REQUESTED', {
      requestedAt: new Date().toISOString(),
      email: email
    });

    res.json({ 
      success: true, 
      message: 'Password reset link sent to your email',
      // REMOVE THIS IN PRODUCTION - only for development/testing
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    res.status(500).json({ error: 'Failed to process password reset request' });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const result = await authService.resetPassword(token, newPassword);
    
    if (result.success) {
      res.json({ success: true, message: 'Password reset successfully. You can now log in with your new password.' });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Validate reset token
router.get('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const validation = authService.validateResetToken(token);
    
    if (validation.valid) {
      res.json({ valid: true, email: validation.email });
    } else {
      res.status(400).json({ valid: false, error: validation.reason });
    }
  } catch (error) {
    console.error('Error validating reset token:', error);
    res.status(500).json({ error: 'Failed to validate reset token' });
  }
});

export default router;

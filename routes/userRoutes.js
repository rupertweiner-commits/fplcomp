import express from 'express';
import { DraftService } from '../services/draftService.js';

const router = express.Router();
const draftService = new DraftService();

/**
 * GET /api/users/profile/:userId
 * Get user profile information
 */
router.get('/profile/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    // Get user from draft service
    const user = draftService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

          // Return profile data
      res.json({
        success: true,
        data: {
          id: user.id,
          username: user.username,
          email: user.email || '',
          firstName: user.firstName || '',
          lastName: user.lastName || '',
          phone: user.phone || '',
          profilePicture: user.profilePicture || '',
          notificationPreferences: user.notificationPreferences || {
            deadlineReminders: true,
            deadlineSummaries: true,
            transferNotifications: true,
            chipNotifications: true,
            liveScoreUpdates: false,
            weeklyReports: true,
            emailNotifications: true,
            pushNotifications: true
          },
          isAdmin: user.isAdmin || false,
          createdAt: user.createdAt || new Date().toISOString()
        }
      });
    
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile'
    });
  }
});

/**
 * PUT /api/users/profile/:userId
 * Update user profile information
 */
router.put('/profile/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { email, firstName, lastName, phone, profilePicture, notificationPreferences } = req.body;
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    // Validate required fields
    if (!email || !firstName || !lastName || !profilePicture) {
      return res.status(400).json({
        success: false,
        error: 'Email, first name, last name, and profile picture are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Get user from draft service
    const user = draftService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update user profile
    const updatedUser = draftService.updateUserProfile(userId, {
      email: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone ? phone.trim() : '',
      profilePicture: profilePicture.trim(),
      notificationPreferences: notificationPreferences || {
        deadlineReminders: true,
        deadlineSummaries: true,
        transferNotifications: true,
        chipNotifications: true,
        liveScoreUpdates: false,
        weeklyReports: true,
        emailNotifications: true,
        pushNotifications: true
      }
    });

    if (!updatedUser) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update user profile'
      });
    }

    // Return updated profile data
    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone,
        profilePicture: updatedUser.profilePicture,
        notificationPreferences: updatedUser.notificationPreferences,
        isAdmin: updatedUser.isAdmin,
        createdAt: updatedUser.createdAt
      },
      message: 'Profile updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user profile'
    });
  }
});

/**
 * GET /api/users/:userId/complete
 * Check if user profile is complete
 */
router.get('/:userId/complete', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID'
      });
    }

    // Get user from draft service
    const user = draftService.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if profile is complete
    const requiredFields = ['email', 'firstName', 'lastName', 'profilePicture'];
    const isComplete = requiredFields.every(field => {
      if (field === 'profilePicture') {
        return user[field] && user[field].trim() !== '';
      }
      return user[field] && user[field].trim() !== '';
    });

    // Calculate completion percentage
    const completedFields = requiredFields.filter(field => {
      if (field === 'profilePicture') {
        return user[field] && user[field].trim() !== '';
      }
      return user[field] && user[field].trim() !== '';
    }).length;

    const completionPercentage = Math.round((completedFields / requiredFields.length) * 100);

    res.json({
      success: true,
      data: {
        isComplete,
        completionPercentage,
        completedFields,
        totalFields: requiredFields.length,
        missingFields: requiredFields.filter(field => {
          if (field === 'profilePicture') {
            return !user[field] || user[field].trim() === '';
          }
          return !user[field] || user[field].trim() === '';
        })
      }
    });
    
  } catch (error) {
    console.error('Error checking profile completion:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check profile completion'
    });
  }
});

export default router;

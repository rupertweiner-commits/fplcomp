import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class UserService {
  constructor() {
    this.usersDataPath = path.join(__dirname, '../data/draft.json');
    this.uploadDir = path.join(__dirname, '../uploads/profiles');
    this.ensureUploadDirectory();
  }

  async ensureUploadDirectory() {
    try {
      await fs.access(this.uploadDir);
    } catch (error) {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async loadUsers() {
    try {
      const data = await fs.readFile(this.usersDataPath, 'utf8');
      const draftData = JSON.parse(data);
      return draftData.users || [];
    } catch (error) {
      console.error('Failed to load users:', error);
      return [];
    }
  }

  async saveUsers(users) {
    try {
      const data = await fs.readFile(this.usersDataPath, 'utf8');
      const draftData = JSON.parse(data);
      draftData.users = users;
      await fs.writeFile(this.usersDataPath, JSON.stringify(draftData, null, 2));
      return true;
    } catch (error) {
      console.error('Failed to save users:', error);
      return false;
    }
  }

  async getUserById(userId) {
    const users = await this.loadUsers();
    return users.find(user => user.id === userId);
  }

  async getUserByUsername(username) {
    const users = await this.loadUsers();
    return users.find(user => user.username === username);
  }

  async validatePassword(userId, currentPassword) {
    const user = await this.getUserById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    // For existing users with plain text passwords, check directly
    if (user.password === currentPassword) {
      return true;
    }
    
    // For new hashed passwords, use bcrypt
    if (user.passwordHash) {
      return await bcrypt.compare(currentPassword, user.passwordHash);
    }
    
    // If no password fields exist, this is a new user system
    // For now, return false - user needs to set a password
    return false;
  }

  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate current password
      const isValidPassword = await this.validatePassword(userId, currentPassword);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password
      if (!newPassword || newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters long');
      }

      // Hash new password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update user
      const users = await this.loadUsers();
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        throw new Error('User not found');
      }

      // Keep old password for backward compatibility, add new hash
      users[userIndex].passwordHash = passwordHash;
      users[userIndex].passwordUpdatedAt = new Date().toISOString();

      // Save updated users
      await this.saveUsers(users);

      return {
        success: true,
        message: 'Password changed successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw error;
    }
  }

  async changeUsername(userId, currentPassword, newUsername) {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate current password
      const isValidPassword = await this.validatePassword(userId, currentPassword);
      if (!isValidPassword) {
        throw new Error('Current password is incorrect');
      }

      // Validate new username
      if (!newUsername || newUsername.length < 3) {
        throw new Error('Username must be at least 3 characters long');
      }

      if (newUsername.length > 20) {
        throw new Error('Username must be less than 20 characters long');
      }

      // Check if username contains only alphanumeric characters and underscores
      if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
        throw new Error('Username can only contain letters, numbers, and underscores');
      }

      // Check if username is already taken
      const existingUser = await this.getUserByUsername(newUsername);
      if (existingUser && existingUser.id !== userId) {
        throw new Error('Username is already taken');
      }

      // Update user
      const users = await this.loadUsers();
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        throw new Error('User not found');
      }

      // Update username
      users[userIndex].username = newUsername;
      users[userIndex].usernameUpdatedAt = new Date().toISOString();

      // Save updated users
      await this.saveUsers(users);

      return {
        success: true,
        message: 'Username changed successfully',
        newUsername,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw error;
    }
  }

  async setInitialPassword(userId, newPassword) {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user already has a password
      if (user.password || user.passwordHash) {
        throw new Error('User already has a password set');
      }

      // Validate new password
      if (!newPassword || newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      // Hash new password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update user
      const users = await this.loadUsers();
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        throw new Error('User not found');
      }

      // Set initial password
      users[userIndex].passwordHash = passwordHash;
      users[userIndex].passwordUpdatedAt = new Date().toISOString();

      // Save updated users
      await this.saveUsers(users);

      return {
        success: true,
        message: 'Initial password set successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw error;
    }
  }

  async updateProfilePicture(userId, imageBuffer, originalName) {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = path.extname(originalName) || '.jpg';
      const filename = `profile_${userId}_${timestamp}${fileExtension}`;
      const filePath = path.join(this.uploadDir, filename);

      // Save image file
      await fs.writeFile(filePath, imageBuffer);

      // Update user profile
      const users = await this.loadUsers();
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        throw new Error('User not found');
      }

      // Remove old profile picture if exists
      if (users[userIndex].profilePicture) {
        try {
          const oldPicturePath = path.join(__dirname, '..', users[userIndex].profilePicture);
          await fs.unlink(oldPicturePath);
        } catch (error) {
          console.warn('Could not remove old profile picture:', error);
        }
      }

      // Update user with new profile picture path
      users[userIndex].profilePicture = `uploads/profiles/${filename}`;
      users[userIndex].profilePictureUpdatedAt = new Date().toISOString();

      // Save updated users
      await this.saveUsers(users);

      return {
        success: true,
        message: 'Profile picture updated successfully',
        profilePicture: users[userIndex].profilePicture,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw error;
    }
  }

  async updateProfile(userId, updates) {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const users = await this.loadUsers();
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        throw new Error('User not found');
      }

      // Validate and apply updates
      const allowedUpdates = ['displayName', 'email'];
      const updatedFields = {};

      for (const [key, value] of Object.entries(updates)) {
        if (allowedUpdates.includes(key) && value !== undefined) {
          users[userIndex][key] = value;
          updatedFields[key] = value;
        }
      }

      if (Object.keys(updatedFields).length === 0) {
        throw new Error('No valid fields to update');
      }

      users[userIndex].profileUpdatedAt = new Date().toISOString();

      // Save updated users
      await this.saveUsers(users);

      return {
        success: true,
        message: 'Profile updated successfully',
        updatedFields,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw error;
    }
  }

  async getProfilePicture(userId) {
    try {
      const user = await this.getUserById(userId);
      if (!user || !user.profilePicture) {
        return null;
      }

      const picturePath = path.join(__dirname, '..', user.profilePicture);
      const imageBuffer = await fs.readFile(picturePath);
      
      return {
        buffer: imageBuffer,
        contentType: this.getContentType(user.profilePicture),
        filename: path.basename(user.profilePicture)
      };
    } catch (error) {
      console.error('Failed to get profile picture:', error);
      return null;
    }
  }

  getContentType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp'
    };
    return contentTypes[ext] || 'image/jpeg';
  }

  async deleteProfilePicture(userId) {
    try {
      const user = await this.getUserById(userId);
      if (!user || !user.profilePicture) {
        throw new Error('No profile picture to delete');
      }

      const users = await this.loadUsers();
      const userIndex = users.findIndex(u => u.id === userId);
      
      if (userIndex === -1) {
        throw new Error('User not found');
      }

      // Remove file
      const picturePath = path.join(__dirname, '..', user.profilePicture);
      await fs.unlink(picturePath);

      // Update user
      users[userIndex].profilePicture = null;
      users[userIndex].profilePictureUpdatedAt = new Date().toISOString();

      // Save updated users
      await this.saveUsers(users);

      return {
        success: true,
        message: 'Profile picture deleted successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw error;
    }
  }

  async getUserProfile(userId) {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Return profile data (excluding sensitive information and removed fields)
      const profileData = {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        email: user.email || null,
        profilePicture: user.profilePicture || null,
        profilePictureUpdatedAt: user.profilePictureUpdatedAt || null,
        profileUpdatedAt: user.profileUpdatedAt || null,
        passwordUpdatedAt: user.passwordUpdatedAt || null,
        teamSize: user.team ? user.team.length : 0,
        totalPoints: user.totalPoints || 0,
        chipsCount: user.chips ? user.chips.length : 0,
        usedChipsCount: user.usedChips ? user.usedChips.length : 0
      };
      
      // Remove bio and favoriteTeam fields if they exist (for backward compatibility)
      delete profileData.bio;
      delete profileData.favoriteTeam;
      
      return profileData;
    } catch (error) {
      throw error;
    }
  }

  async validateImageFile(imageBuffer, originalName) {
    // Check file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (imageBuffer.length > maxSize) {
      throw new Error('Image file size must be less than 5MB');
    }

    // Check file extension
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const fileExtension = path.extname(originalName).toLowerCase();
    
    if (!allowedExtensions.includes(fileExtension)) {
      throw new Error('Only JPG, PNG, GIF, and WebP images are allowed');
    }

    return true;
  }
}

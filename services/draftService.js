import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { UserService } from './userService.js';
import { activityLogger } from './activityLoggerService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class DraftService {
  constructor() {
    this.dataFile = path.join(__dirname, '../data/draft.json');
    this.userService = new UserService();
    this.draftData = {
      users: [
        { 
          id: 1, 
          username: 'Portia', 
          team: [],
          activePlayers: [], // 4 players fielded this week
          benchedPlayer: null, // 1 player benched this week
          captain: null, // Player ID of captain (gets 2x points)
          chips: [], // Available chips
          usedChips: [] // History of used chips
        },
        { 
          id: 2, 
          username: 'Yasmin', 
          team: [],
          activePlayers: [],
          benchedPlayer: null,
          captain: null,
          chips: [],
          usedChips: []
        },
        { 
          id: 3, 
          username: 'Rupert', 
          isAdmin: true, // Rupert is the admin
          team: [],
          activePlayers: [],
          benchedPlayer: null,
          captain: null,
          chips: [],
          usedChips: []
        },
        { 
          id: 4, 
          username: 'Will', 
          team: [],
          activePlayers: [],
          benchedPlayer: null,
          captain: null,
          chips: [],
          usedChips: []
        }
      ],
      draftedPlayers: [], // Array of player IDs that have been drafted
      draftOrder: [1, 2, 3, 4], // User IDs in draft order
      currentDraftPick: 0, // Index of current draft pick
      isDraftComplete: false,
      currentGameweek: 1,
      transfers: [], // Array of pending transfers
      chipHistory: [], // History of all chip activations
      simulationHistory: {}, // Simulated gameweek data when in simulation mode
      simulationMode: false, // Toggle between simulation and real FPL data
      realGameweek: null, // Store the actual FPL gameweek when in simulation mode
      lastUpdated: new Date().toISOString()
    };
    this.chelseaTeamId = 7; // Chelsea's team ID from FPL API
  }

  async initialize() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dataFile);
      await fs.mkdir(dataDir, { recursive: true });
      
      // Try to load existing data
      try {
        const data = await fs.readFile(this.dataFile, 'utf8');
        this.draftData = JSON.parse(data);
        
        // Ensure critical fields exist with default values
        if (this.draftData.simulationMode === null || this.draftData.simulationMode === undefined) {
          this.draftData.simulationMode = false;
        }
        if (this.draftData.realGameweek === null || this.draftData.realGameweek === undefined) {
          this.draftData.realGameweek = null;
        }
        if (this.draftData.simulationHistory === null || this.draftData.simulationHistory === undefined) {
          this.draftData.simulationHistory = {};
        }
        
        // Ensure admin flag is set for Rupert
        this.draftData.users.forEach(user => {
          if (user.username === 'Rupert' && user.isAdmin === undefined) {
            user.isAdmin = true;
          } else if (user.isAdmin === undefined) {
            user.isAdmin = false;
          }
          
          // Initialize profile fields if they don't exist
          if (user.email === undefined) {
            user.email = '';
          }
          if (user.firstName === undefined) {
            user.firstName = '';
          }
          if (user.lastName === undefined) {
            user.lastName = '';
          }
          if (user.phone === undefined) {
            user.phone = '';
          }
          if (user.profilePicture === undefined) {
            user.profilePicture = '';
          }
          if (user.notificationPreferences === undefined) {
            user.notificationPreferences = {
              deadlineReminders: true,
              deadlineSummaries: true,
              transferNotifications: true,
              chipNotifications: true,
              liveScoreUpdates: false,
              weeklyReports: true,
              emailNotifications: true,
              pushNotifications: true
            };
          }
          
          // Remove old password fields for security (now handled by user service)
          if (user.password) {
            delete user.password;
          }
        });
        
        console.log('✅ Draft data loaded from file');
      } catch (error) {
        // File doesn't exist, create it with default data
        await this.saveDraftData();
        console.log('✅ New draft data file created');
      }
      
      // Only sync with FPL API gameweek on first initialization or if realGameweek is not set
      if (!this.draftData.realGameweek) {
        await this.syncWithFPLGameweek();
      }
    } catch (error) {
      console.error('❌ Failed to initialize DraftService:', error);
      throw error;
    }
  }

  // Sync draft gameweek with FPL API current gameweek
  async syncWithFPLGameweek() {
    try {
      // Import FPLApiService dynamically to avoid circular imports
      const { FPLApiService } = await import('./fplApiService.js');
      const fplService = new FPLApiService();
      await fplService.initialize();
      
      const fplGameweek = await fplService.getCurrentGameweek();
      
      if (fplGameweek) {
        // Always store the real FPL gameweek
        this.draftData.realGameweek = fplGameweek;
        
        // Only sync currentGameweek if not in simulation mode
        if (!this.draftData.simulationMode && fplGameweek !== this.draftData.currentGameweek) {
          console.log(`🔄 Syncing draft gameweek from ${this.draftData.currentGameweek} to FPL gameweek ${fplGameweek}`);
          this.draftData.currentGameweek = fplGameweek;
          await this.saveDraftData();
        } else if (this.draftData.simulationMode) {
          console.log(`🎮 Simulation mode active - keeping simulated gameweek ${this.draftData.currentGameweek}, real FPL is ${fplGameweek}`);
        }
      }
    } catch (error) {
      console.error('Failed to sync with FPL gameweek:', error);
      // Don't throw - continue with existing gameweek if sync fails
    }
  }

  async saveDraftData() {
    try {
      this.draftData.lastUpdated = new Date().toISOString();
      await fs.writeFile(this.dataFile, JSON.stringify(this.draftData, null, 2));
    } catch (error) {
      console.error('❌ Failed to save draft data:', error);
      throw error;
    }
  }

  // User authentication
  async authenticateUser(username, password) {
    try {
      // First find the user in draft data to get their ID and draft-specific info
      const draftUser = this.draftData.users.find(u => u.username === username);
      if (!draftUser) {
        return null;
      }

      // Use user service to validate password
      const isValidPassword = await this.userService.validatePassword(draftUser.id, password);
      if (!isValidPassword) {
        return null;
      }

      // Return user data without password
      const { password: _, ...userWithoutPassword } = draftUser;
      return userWithoutPassword;
    } catch (error) {
      console.error('Authentication error:', error);
      return null;
    }
  }

  // Get all users with their current teams
  getAllUsers() {
    return this.draftData.users.map(user => ({
      id: user.id,
      username: user.username,
      team: user.team,
      teamSize: user.team.length,
      activePlayers: user.activePlayers || [],
      benchedPlayer: user.benchedPlayer || null,
      captain: user.captain || null,
      chips: user.chips || [],
      usedChips: user.usedChips || [],
      profilePicture: user.profilePicture || null
    }));
  }

  // Get user by ID
  getUserById(userId) {
    const user = this.draftData.users.find(u => u.id === userId);
    if (!user) return null;
    
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  // Get user by email (for password reset)
  getUserByEmail(email) {
    // For now, we'll use username as email since we don't have email field yet
    // In production, add email field to user objects
    return this.draftData.users.find(user => user.username === email);
  }

  // Update user password
  async updateUserPassword(userId, hashedPassword) {
    const user = this.draftData.users.find(u => u.id === userId);
    if (user) {
      user.passwordHash = hashedPassword;
      // Remove old plain text password if it exists
      delete user.password;
      await this.saveData();
      return true;
    }
    return false;
  }

  // Update user profile picture
  async updateUserProfilePicture(userId, picturePath) {
    const user = this.draftData.users.find(u => u.id === userId);
    if (!user) return false;
    
    user.profilePicture = picturePath;
    await this.saveDraftData();
    return true;
  }

  // Get user profile
  async getUserProfile(userId) {
    const user = this.getUserById(userId);
    if (!user) {
      return null;
    }
    
    // Return safe user data (no passwords)
    const { password, passwordHash, ...safeUser } = user;
    return safeUser;
  }

  // Update profile
  async updateProfile(userId, updates) {
    const user = this.draftData.users.find(u => u.id === userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Only allow updating safe fields
    const allowedFields = ['username', 'profilePicture'];
    const safeUpdates = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        safeUpdates[key] = value;
      }
    }

    // Apply updates
    Object.assign(user, safeUpdates);
    await this.saveDraftData();

    return { success: true, user: await this.getUserProfile(userId) };
  }

  // Update user profile with extended fields
  async updateUserProfile(userId, updates) {
    console.log('🔍 updateUserProfile called with:', { userId, updates });
    
    const user = this.draftData.users.find(u => u.id === userId);
    if (!user) {
      console.log('❌ User not found:', userId);
      return null;
    }

    console.log('🔍 Found user:', { 
      id: user.id, 
      username: user.username, 
      currentEmail: user.email,
      currentFirstName: user.firstName,
      currentLastName: user.lastName
    });

    // Allow updating profile fields
    const allowedFields = ['email', 'firstName', 'lastName', 'phone', 'profilePicture', 'notificationPreferences'];
    const safeUpdates = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        safeUpdates[key] = value;
        console.log(`✅ Updating ${key}:`, value);
      } else {
        console.log(`⚠️ Skipping disallowed field: ${key}`);
      }
    }

    // Apply updates
    Object.assign(user, safeUpdates);
    
    console.log('🔍 User after update:', { 
      id: user.id, 
      username: user.username, 
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    });
    
    await this.saveDraftData();

    return user;
  }

  // Validate image file
  async validateImageFile(buffer, filename) {
    // Basic validation - in production, add more comprehensive checks
    if (!buffer || buffer.length === 0) {
      throw new Error('No file data provided');
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const fileExtension = filename.split('.').pop()?.toLowerCase();
    
    if (!['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
      throw new Error('Invalid file type. Only JPG, PNG, and GIF are allowed.');
    }

    if (buffer.length > 5 * 1024 * 1024) { // 5MB limit
      throw new Error('File size too large. Maximum size is 5MB.');
    }

    return true;
  }

  // Get profile picture
  async getProfilePicture(userId) {
    const user = this.getUserById(userId);
    if (!user || !user.profilePicture) {
      return null;
    }
    return user.profilePicture;
  }

  // Delete profile picture
  async deleteProfilePicture(userId) {
    const user = this.draftData.users.find(u => u.id === userId);
    return { success: true };
  }

  // Check if a player is available for drafting
  isPlayerAvailable(playerId) {
    return !this.draftData.draftedPlayers.includes(playerId);
  }

  // Get current draft turn
  getCurrentDraftTurn() {
    if (this.draftData.isDraftComplete) {
      return null;
    }
    
    const userIndex = this.draftData.currentDraftPick % this.draftData.draftOrder.length;
    return this.draftData.draftOrder[userIndex];
  }

  // Validate team formation (2 GK/DEF + 3 MID/FWD)
  validateTeamFormation(team, playerTypes) {
    const defenders = team.filter(playerId => {
      const playerType = playerTypes[playerId];
      return playerType === 1 || playerType === 2; // GK or DEF
    }).length;
    
    const attackers = team.filter(playerId => {
      const playerType = playerTypes[playerId];
      return playerType === 3 || playerType === 4; // MID or FWD
    }).length;
    
    return {
      isValid: defenders <= 2 && attackers <= 3 && (defenders + attackers) <= 5,
      defenders,
      attackers,
      canAddDefender: defenders < 2,
      canAddAttacker: attackers < 3,
      teamSize: defenders + attackers
    };
  }

  // Draft a player
  async draftPlayer(userId, playerId, playerData) {
    try {
      // Validate user exists
      const user = this.draftData.users.find(u => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if it's user's turn (in draft mode)
      if (!this.draftData.isDraftComplete) {
        const currentTurn = this.getCurrentDraftTurn();
        if (currentTurn !== userId) {
          throw new Error(`Not your turn. Current turn: User${currentTurn}`);
        }
      }

      // Log the transfer activity
      activityLogger.logTransfer(
        userId, 
        user.username, 
        playerId, 
        playerData.web_name || `Player ${playerId}`, 
        'IN'
      );

      // Check if player is available
      if (!this.isPlayerAvailable(playerId)) {
        throw new Error('Player already drafted');
      }

      // Check if user's team is full
      if (user.team.length >= 5) {
        throw new Error('Team is full (max 5 players)');
      }

      // Validate formation rules
      const playerTypes = { [playerId]: playerData.element_type };
      user.team.forEach(id => {
        // We'll need to pass existing player types too
        playerTypes[id] = playerData.element_type; // Simplified for now
      });
      
      const newTeam = [...user.team, playerId];
      const validation = this.validateTeamFormation(newTeam, playerTypes);
      
      if (!validation.isValid) {
        throw new Error('Invalid team formation. Max 2 GK/DEF and 3 MID/FWD');
      }

      // Add player to user's team
      user.team.push(playerId);
      this.draftData.draftedPlayers.push(playerId);
      
      // Advance draft
      if (!this.draftData.isDraftComplete) {
        this.draftData.currentDraftPick++;
        
        // Check if draft is complete (all users have 5 players)
        const allTeamsFull = this.draftData.users.every(u => u.team.length === 5);
        if (allTeamsFull) {
          this.draftData.isDraftComplete = true;
        }
      }

      await this.saveDraftData();
      
      return {
        success: true,
        message: `Player drafted successfully`,
        userTeam: user.team,
        draftComplete: this.draftData.isDraftComplete,
        nextTurn: this.getCurrentDraftTurn()
      };
      
    } catch (error) {
      throw error;
    }
  }

  // Remove player from team (only if draft is complete)
  async removePlayer(userId, playerId) {
    try {
      if (!this.draftData.isDraftComplete) {
        throw new Error('Cannot remove players during draft');
      }

      const user = this.draftData.users.find(u => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }

      const playerIndex = user.team.indexOf(playerId);
      if (playerIndex === -1) {
        throw new Error('Player not in your team');
      }

      // Remove from team and drafted players
      user.team.splice(playerIndex, 1);
      const draftedIndex = this.draftData.draftedPlayers.indexOf(playerId);
      if (draftedIndex > -1) {
        this.draftData.draftedPlayers.splice(draftedIndex, 1);
      }

      await this.saveDraftData();
      
      return {
        success: true,
        message: 'Player removed from team',
        userTeam: user.team
      };
      
    } catch (error) {
      throw error;
    }
  }

  // Reset draft (for testing/new seasons)
  async resetDraft() {
    try {
      this.draftData.users.forEach(user => {
        user.team = [];
        user.activePlayers = [];
        user.benchedPlayer = null;
        user.captain = null;
        user.chips = [];
        user.usedChips = [];
      });
      this.draftData.draftedPlayers = [];
      this.draftData.currentDraftPick = 0;
      this.draftData.isDraftComplete = false;
      this.draftData.transfers = [];
      this.draftData.chipHistory = [];
      
      // Reset simulation-related fields
      this.draftData.currentGameweek = 1;
      this.draftData.simulationMode = false;
      this.draftData.realGameweek = null;
      this.draftData.simulationHistory = {};
      
      await this.saveDraftData();
      
      return {
        success: true,
        message: 'Draft reset successfully'
      };
    } catch (error) {
      throw error;
    }
  }

  // Transfer system
  // Check if a user can make a transfer in the current gameweek
  canUserTransfer(userId) {
    const gameweek = this.getActiveGameweek();
    const userCount = this.draftData.users.length; // Should be 4
    
    // Calculate which user can transfer based on gameweek
    // Gameweek 1: User 1 (Portia), Gameweek 2: User 2 (Yasmin), etc.
    const transferUserIndex = ((gameweek - 1) % userCount);
    const transferUserId = transferUserIndex + 1; // User IDs are 1-based
    
    return userId === transferUserId;
  }
  
  // Get the user who can transfer in the current gameweek
  getCurrentTransferUser() {
    const gameweek = this.getActiveGameweek();
    const userCount = this.draftData.users.length;
    const transferUserIndex = ((gameweek - 1) % userCount);
    const transferUserId = transferUserIndex + 1;
    
    return this.draftData.users.find(u => u.id === transferUserId);
  }

  // Get the active gameweek (simulated if in simulation mode, otherwise current)
  getActiveGameweek() {
    return this.draftData.simulationMode 
      ? this.draftData.currentGameweek 
      : (this.draftData.realGameweek || this.draftData.currentGameweek);
  }

  async makeTransfer(userId, playerOutId, playerInId) {
    try {
      // Check if it's this user's turn to transfer
      if (!this.canUserTransfer(userId)) {
        const transferUser = this.getCurrentTransferUser();
        const activeGameweek = this.getActiveGameweek();
        throw new Error(`Not your turn to transfer. ${transferUser?.username || 'Another user'} can transfer in gameweek ${activeGameweek}`);
      }
      
      const user = this.draftData.users.find(u => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if player being transferred out is in user's team
      if (!user.team.includes(playerOutId)) {
        throw new Error('Player not in your team');
      }

      // Check if player being transferred in is already drafted
      if (this.draftData.draftedPlayers.includes(playerInId)) {
        throw new Error('Player already drafted by another user');
      }

      // Check if user has already made a transfer this gameweek
      const userTransfersThisWeek = this.draftData.transfers.filter(t => 
        t.userId === userId && t.gameweek === this.getActiveGameweek()
      );
      
      if (userTransfersThisWeek.length > 0) {
        throw new Error(`You have already made a transfer in gameweek ${this.getActiveGameweek()}. Only one transfer per gameweek is allowed.`);
      }

      // Check position compatibility and deadline - import FPLApiService once
      const { FPLApiService } = await import('./fplApiService.js');
      const fplService = new FPLApiService();
      await fplService.initialize();

      // Check if we're before the gameweek deadline
      const isBeforeDeadline = await fplService.isBeforeDeadline(this.getActiveGameweek());
      if (!isBeforeDeadline) {
        throw new Error(`Transfer deadline has passed for gameweek ${this.getActiveGameweek()}. No more transfers allowed.`);
      }
      
      const allPlayers = await fplService.getBootstrapStatic();
      const playerOut = allPlayers.elements.find(p => p.id === playerOutId);
      const playerIn = allPlayers.elements.find(p => p.id === playerInId);
      
      if (!playerOut || !playerIn) {
        throw new Error('Player data not found');
      }
      
      // Check position compatibility - Goalkeepers & Defenders can transfer for each other, Midfielders & Forwards can transfer for each other
      const isDefensivePosition = (pos) => pos === 1 || pos === 2; // Goalkeeper or Defender
      const isAttackingPosition = (pos) => pos === 3 || pos === 4; // Midfielder or Forward
      
      if (isDefensivePosition(playerOut.element_type) !== isDefensivePosition(playerIn.element_type)) {
        const positionNames = { 1: 'Goalkeeper', 2: 'Defender', 3: 'Midfielder', 4: 'Forward' };
        throw new Error(`Position mismatch: Cannot transfer ${positionNames[playerOut.element_type]} for ${positionNames[playerIn.element_type]}. Goalkeepers & Defenders can only transfer for each other, and Midfielders & Forwards can only transfer for each other.`);
      }

      // Perform transfer
      const playerIndex = user.team.indexOf(playerOutId);
      user.team[playerIndex] = playerInId;

      // Update drafted players list
      const draftedIndex = this.draftData.draftedPlayers.indexOf(playerOutId);
      this.draftData.draftedPlayers[draftedIndex] = playerInId;

      // Update active players if needed
      const activeIndex = user.activePlayers.indexOf(playerOutId);
      if (activeIndex > -1) {
        user.activePlayers[activeIndex] = playerInId;
      }

      // Update captain if needed
      if (user.captain === playerOutId) {
        user.captain = playerInId;
      }

      // Record the transfer for this gameweek
      this.draftData.transfers.push({
        userId: userId,
        playerOutId: playerOutId,
        playerInId: playerInId,
        gameweek: this.getActiveGameweek(),
        timestamp: new Date().toISOString()
      });

      await this.saveDraftData();

      return {
        success: true,
        message: 'Transfer completed successfully',
        userTeam: user.team
      };
    } catch (error) {
      throw error;
    }
  }

  // Auto-set default gameweek team if not already set
  async ensureGameweekTeamSet(userId) {
    const user = this.draftData.users.find(u => u.id === userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user already has a valid gameweek team
    const hasValidTeam = user.activePlayers?.length === 4 && 
                        user.benchedPlayer !== null && 
                        user.captain !== null;

    if (!hasValidTeam && user.team.length === 5) {
      // Auto-set default team: first 4 active, last 1 benched, first as captain
      user.activePlayers = user.team.slice(0, 4);
      user.benchedPlayer = user.team[4];
      user.captain = user.team[0];
      
      await this.saveDraftData();
      
      console.log(`🔄 Auto-set default gameweek team for ${user.username}: Active: ${user.activePlayers}, Bench: ${user.benchedPlayer}, Captain: ${user.captain}`);
    }

    return {
      activePlayers: user.activePlayers || [],
      benchedPlayer: user.benchedPlayer,
      captain: user.captain
    };
  }

  // Get user's current gameweek team
  async getGameweekTeam(userId) {
    const user = this.draftData.users.find(u => u.id === userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Ensure team is set before returning
    await this.ensureGameweekTeamSet(userId);
    
    return {
      activePlayers: user.activePlayers || [],
      benchedPlayer: user.benchedPlayer,
      captain: user.captain,
      fullTeam: user.team
    };
  }

  // Set active players and bench for gameweek
  async setGameweekTeam(userId, activePlayers, benchedPlayer, captain) {
    try {
      const user = this.draftData.users.find(u => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Validate that all players are in user's team
      const allPlayers = [...activePlayers, benchedPlayer];
      for (const playerId of allPlayers) {
        if (!user.team.includes(playerId)) {
          throw new Error(`Player ${playerId} not in your team`);
        }
      }

      // Validate team composition (4 active + 1 bench = 5 total)
      if (activePlayers.length !== 4) {
        throw new Error('Must select exactly 4 active players');
      }

      if (!captain || !activePlayers.includes(captain)) {
        throw new Error('Captain must be one of the active players');
      }

      // Check if we're before the gameweek deadline
      const { FPLApiService } = await import('./fplApiService.js');
      const fplService = new FPLApiService();
      await fplService.initialize();
      
      const activeGameweek = this.getActiveGameweek();
      const isBeforeDeadline = await fplService.isBeforeDeadline(activeGameweek);
      if (!isBeforeDeadline) {
        throw new Error(`Team selection deadline has passed for gameweek ${activeGameweek}. No more changes allowed.`);
      }

      // Log captain change if it changed
      if (user.captain !== captain) {
        const { FPLApiService } = await import('./fplApiService.js');
        const fplService = new FPLApiService();
        await fplService.initialize();
        
        const bootstrap = await fplService.getBootstrapStatic();
        const previousCaptain = bootstrap.elements.find(p => p.id === user.captain);
        const newCaptain = bootstrap.elements.find(p => p.id === captain);
        
        activityLogger.logCaptainChange(
          userId,
          user.username,
          user.captain,
          previousCaptain?.web_name || `Player ${user.captain}`,
          captain,
          newCaptain?.web_name || `Player ${captain}`
        );
      }

      // Log bench change if it changed
      if (user.benchedPlayer !== benchedPlayer) {
        const { FPLApiService } = await import('./fplApiService.js');
        const fplService = new FPLApiService();
        await fplService.initialize();
        
        const bootstrap = await fplService.getBootstrapStatic();
        const benchedPlayerData = bootstrap.elements.find(p => p.id === benchedPlayer);
        
        activityLogger.logBenchChange(
          userId,
          user.username,
          benchedPlayer,
          benchedPlayerData?.web_name || `Player ${benchedPlayer}`,
          'BENCHED'
        );
      }

      // Update user's gameweek team
      user.activePlayers = activePlayers;
      user.benchedPlayer = benchedPlayer;
      user.captain = captain;

      await this.saveDraftData();

      return {
        success: true,
        message: 'Gameweek team set successfully',
        activePlayers: user.activePlayers,
        benchedPlayer: user.benchedPlayer,
        captain: user.captain
      };
    } catch (error) {
      throw error;
    }
  }

  // Chip system methods
  async giveChipToUser(userId, chipData) {
    try {
      const user = this.draftData.users.find(u => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }

      const activeGameweek = this.getActiveGameweek();
      const chip = {
        id: `chip_${Date.now()}_${userId}`,
        ...chipData,
        receivedGameweek: activeGameweek,
        expiresGameweek: activeGameweek + 5 // Chips expire after 5 gameweeks
      };

      user.chips.push(chip);
      await this.saveDraftData();

      return {
        success: true,
        message: 'Chip added to user inventory',
        chip
      };
    } catch (error) {
      throw error;
    }
  }

  async useChip(userId, chipId, targetUserId = null, additionalData = {}) {
    try {
      const user = this.draftData.users.find(u => u.id === userId);
      if (!user) {
        throw new Error('User not found');
      }

      const chipIndex = user.chips.findIndex(c => c.id === chipId);
      if (chipIndex === -1) {
        throw new Error('Chip not found in user inventory');
      }

      const chip = user.chips[chipIndex];

      // Check if chip has expired
      const activeGameweek = this.getActiveGameweek();
      if (chip.expiresGameweek < activeGameweek) {
        throw new Error('Chip has expired');
      }

      // Check if we're before the gameweek deadline
      const { FPLApiService } = await import('./fplApiService.js');
      const fplService = new FPLApiService();
      await fplService.initialize();
      
      const isBeforeDeadline = await fplService.isBeforeDeadline(activeGameweek);
      if (!isBeforeDeadline) {
        throw new Error(`Chip usage deadline has passed for gameweek ${activeGameweek}. No more chips can be played.`);
      }

      // Execute chip effect
      const result = await this.executeChipEffect(chip, userId, targetUserId, additionalData);

      // Move chip to used chips
      user.chips.splice(chipIndex, 1);
      user.usedChips.push({
        ...chip,
        usedGameweek: activeGameweek,
        targetUserId,
        result
      });

      // Add to global chip history
      this.draftData.chipHistory.push({
        chipId: chip.id,
        chipName: chip.name,
        userId,
        targetUserId,
        gameweek: activeGameweek,
        timestamp: new Date().toISOString(),
        result
      });

      // Log chip usage activity
      activityLogger.logChipUsage(
        userId,
        user.username,
        chip.id,
        chip.name,
        chip.description || 'Special ability chip',
        targetUserId
      );

      await this.saveDraftData();

      return {
        success: true,
        message: `${chip.name} used successfully`,
        result
      };
    } catch (error) {
      throw error;
    }
  }

  async executeChipEffect(chip, userId, targetUserId, additionalData) {
    const user = this.draftData.users.find(u => u.id === userId);
    const targetUser = targetUserId ? this.draftData.users.find(u => u.id === targetUserId) : null;

    switch (chip.name) {
      case 'Transfer Hijack':
        // Steal another user's planned transfer
        if (!targetUser) throw new Error('Target user required');
        // Implementation would depend on how transfers are stored
        return { effect: 'Transfer hijacked', targetUser: targetUser.username };

      case 'Point Vampire':
        // Steal 25% of another user's points (would be calculated during scoring)
        if (!targetUser) throw new Error('Target user required');
        return { effect: 'Point vampire activated', targetUser: targetUser.username, percentage: 25 };

      case 'Captain Chaos':
        // Randomize another user's captain
        if (!targetUser) throw new Error('Target user required');
        if (targetUser.activePlayers.length > 0) {
          const randomIndex = Math.floor(Math.random() * targetUser.activePlayers.length);
          targetUser.captain = targetUser.activePlayers[randomIndex];
        }
        return { effect: 'Captain randomized', targetUser: targetUser.username, newCaptain: targetUser.captain };

      case 'Injury Report':
        // Force user to bench their highest-scoring player (would need current scores)
        if (!targetUser) throw new Error('Target user required');
        // Implementation would need current gameweek scores
        return { effect: 'Injury report activated', targetUser: targetUser.username };

      case 'Bench Boost':
        // User's bench player points count this gameweek
        return { effect: 'Bench boost activated', user: user.username };

      case 'Team Scrambler':
        // Randomly redistribute all teams
        this.scrambleAllTeams();
        return { effect: 'All teams scrambled' };

      case 'Reverse Psychology':
        // Lowest scorer gets highest scorer's points (calculated during scoring)
        return { effect: 'Reverse psychology activated' };

      default:
        throw new Error('Unknown chip effect');
    }
  }

  scrambleAllTeams() {
    // Collect all drafted players
    const allPlayers = [...this.draftData.draftedPlayers];
    
    // Shuffle players
    for (let i = allPlayers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allPlayers[i], allPlayers[j]] = [allPlayers[j], allPlayers[i]];
    }

    // Redistribute to users (5 players each)
    this.draftData.users.forEach((user, index) => {
      user.team = allPlayers.slice(index * 5, (index + 1) * 5);
      // Reset weekly selections
      user.activePlayers = [];
      user.benchedPlayer = null;
      user.captain = null;
    });
  }

  // Check if user is admin
  isUserAdmin(userId) {
    const user = this.draftData.users.find(u => u.id === userId);
    return user ? user.isAdmin === true : false;
  }

  // Get draft status
  // Toggle simulation mode on/off
  async toggleSimulationMode(enable) {
    this.draftData.simulationMode = enable;
    
    if (enable) {
      // Entering simulation mode - store current real gameweek if not already stored
      if (!this.draftData.realGameweek) {
        await this.syncWithFPLGameweek();
      }
      console.log(`🎮 Simulation mode ENABLED - Current simulated gameweek: ${this.draftData.currentGameweek}, Real FPL: ${this.draftData.realGameweek}`);
    } else {
      // Exiting simulation mode - sync back to real FPL gameweek
      if (this.draftData.realGameweek) {
        this.draftData.currentGameweek = this.draftData.realGameweek;
        console.log(`🏆 Simulation mode DISABLED - Synced back to real FPL gameweek: ${this.draftData.currentGameweek}`);
      }
      // Clear simulation data when exiting simulation mode
      this.draftData.simulationHistory = {};
    }
    
    await this.saveDraftData();
    return this.draftData.simulationMode;
  }

  // Advance to next gameweek (simulation mode only)
  async advanceSimulationGameweek() {
    if (!this.draftData.simulationMode) {
      throw new Error('Cannot advance gameweek - simulation mode is disabled');
    }
    
    if (this.draftData.currentGameweek >= 38) {
      throw new Error('Cannot advance beyond gameweek 38');
    }
    
    this.draftData.currentGameweek += 1;
    await this.saveDraftData();
    
    console.log(`🎮 Advanced to simulated gameweek ${this.draftData.currentGameweek}`);
    return this.draftData.currentGameweek;
  }

  getDraftStatus() {
    const currentTransferUser = this.getCurrentTransferUser();
    const activeGameweek = this.getActiveGameweek();
    
    return {
      isDraftComplete: this.draftData.isDraftComplete,
      currentTurn: this.getCurrentDraftTurn(),
      draftedCount: this.draftData.draftedPlayers.length,
      draftedPlayers: this.draftData.draftedPlayers,
      totalPicks: this.draftData.users.length * 5,
      currentGameweek: this.draftData.currentGameweek,
      realGameweek: this.draftData.realGameweek,
      activeGameweek: activeGameweek, // The gameweek used for game logic
      simulationMode: this.draftData.simulationMode,
      currentTransferUser: currentTransferUser ? {
        id: currentTransferUser.id,
        username: currentTransferUser.username
      } : null,
      users: this.getAllUsers()
    };
  }

  getDraftData() {
    return this.draftData;
  }

  // Filter Chelsea players only
  filterChelseaPlayers(allPlayers) {
    return allPlayers.filter(player => player.team === this.chelseaTeamId);
  }

  // Get available Chelsea players for drafting
  getAvailableChelseaPlayers(allPlayers) {
    const chelseaPlayers = this.filterChelseaPlayers(allPlayers);
    return chelseaPlayers.filter(player => this.isPlayerAvailable(player.id));
  }

  // Calculate team scores from live FPL data
  calculateTeamScores(liveGameweekData) {
    const teamScores = {};
    
    this.draftData.users.forEach(user => {
      let totalScore = 0;
      const playerScores = [];
      
      user.team.forEach(playerId => {
        const playerLiveData = liveGameweekData?.elements?.find(p => p.id === playerId);
        const points = playerLiveData?.stats?.total_points || 0;
        totalScore += points;
        playerScores.push({
          playerId,
          points
        });
      });
      
      teamScores[user.id] = {
        userId: user.id,
        username: user.username,
        totalScore,
        playerScores,
        teamSize: user.team.length
      };
    });
    
    // Sort by total score descending
    const sortedScores = Object.values(teamScores).sort((a, b) => b.totalScore - a.totalScore);
    
    return sortedScores;
  }
}

export const draftService = new DraftService();

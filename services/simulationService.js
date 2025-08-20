import { DraftService } from './draftService.js';
import { ChipService } from './chipService.js';

export class SimulationService {
  constructor(draftServiceInstance = null) {
    this.draftService = draftServiceInstance || new DraftService();
    this.chipService = new ChipService(this.draftService);
    
    this.chelseaPlayers = []; // Will be loaded from FPL API
    this.gameweekScores = new Map(); // Store scores for each gameweek
    this.activeChipEffects = new Map(); // Track active chip effects
  }

  async initialize() {
    await this.draftService.initialize();
    await this.chipService.initialize();
    
    // Load Chelsea players from FPL API
    await this.loadChelseaPlayers();
    
    // Load existing simulation history
    const draftData = this.draftService.draftData;
    if (draftData.simulationHistory) {
      for (const [gameweek, data] of Object.entries(draftData.simulationHistory)) {
        this.gameweekScores.set(parseInt(gameweek), data);
      }
    }
  }

  // Load real Chelsea players from FPL API
  async loadChelseaPlayers() {
    try {
      // Import FPLApiService dynamically to avoid circular imports
      const { FPLApiService } = await import('./fplApiService.js');
      const fplService = new FPLApiService();
      await fplService.initialize();
      
      const bootstrap = await fplService.getBootstrapStatic();
      
      // Filter Chelsea players (team ID 7)
      this.chelseaPlayers = bootstrap.elements
        .filter(player => player.team === 7)
        .map(player => {
          const position = bootstrap.element_types.find(pos => pos.id === player.element_type);
          return {
            ...player,
            position_name: position?.singular_name || 'Unknown',
            position_short: position?.singular_name_short || 'UNK',
            baseForm: Math.max(1, Math.min(10, player.form ? parseInt(player.form) : 5)) // Convert form to 1-10 scale
          };
        });
      
      console.log(`📋 Loaded ${this.chelseaPlayers.length} Chelsea players from FPL API`);
      
    } catch (error) {
      console.error('Failed to load Chelsea players:', error);
      // Fallback to empty array if API fails
      this.chelseaPlayers = [];
    }
  }

  // Generate random teams for all users
  async randomizeAllTeams() {
    try {
      console.log('🎲 Randomizing teams for all users...');
      
      if (this.chelseaPlayers.length === 0) {
        throw new Error('No Chelsea players loaded. Please try again.');
      }
      
      // Get available players and shuffle them
      const availablePlayers = [...this.chelseaPlayers];
      this.shuffleArray(availablePlayers);
      
      // Distribute 5 players to each user with formation constraints
      const users = this.draftService.getDraftStatus().users;
      const newTeams = {};
      const usedPlayerIds = new Set(); // Track used players to prevent duplicates
      
      for (const user of users) {
        const team = this.generateBalancedTeamWithoutDuplicates(availablePlayers, usedPlayerIds);
        newTeams[user.id] = team;
        
        // Mark these players as used
        team.forEach(player => usedPlayerIds.add(player.id));
        
        console.log(`👥 ${user.username}: ${team.map(p => p.web_name).join(', ')}`);
      }
      
      // Update draft service with new teams
      await this.updateUserTeams(newTeams);
      
      // Mark draft as complete and update drafted players
      const draftData = this.draftService.draftData;
      draftData.isDraftComplete = true;
      
      // Extract all player IDs from all teams
      const allDraftedIds = Object.values(newTeams).flat().map(p => p.id);
      draftData.draftedPlayers = allDraftedIds;
      
      console.log(`📋 Marked ${allDraftedIds.length} players as drafted:`, allDraftedIds);
      console.log(`📊 Unique players: ${new Set(allDraftedIds).size}, Total assignments: ${allDraftedIds.length}`);
      await this.draftService.saveDraftData();
      
      return {
        success: true,
        message: 'Teams randomized successfully',
        teams: newTeams
      };
      
    } catch (error) {
      console.error('Error randomizing teams:', error);
      throw error;
    }
  }

  // Generate a balanced team without duplicates (max 2 GK/DEF, max 3 MID/FWD)
  generateBalancedTeamWithoutDuplicates(players, usedPlayerIds) {
    const team = [];
    const positions = { 1: 0, 2: 0, 3: 0, 4: 0 }; // GK, DEF, MID, FWD
    
    // Filter out already used players
    const availablePlayers = players.filter(player => !usedPlayerIds.has(player.id));
    
    if (availablePlayers.length < 5) {
      throw new Error('Not enough players available for team generation');
    }
    
    // Try to create a balanced team respecting formation constraints
    for (const player of availablePlayers) {
      if (team.length >= 5) break;
      
      const elementType = player.element_type;
      
      // Check formation constraints
      const isDefensive = elementType === 1 || elementType === 2; // GK or DEF
      const isAttacking = elementType === 3 || elementType === 4; // MID or FWD
      
      const currentDefensive = positions[1] + positions[2];
      const currentAttacking = positions[3] + positions[4];
      
      if ((isDefensive && currentDefensive < 2) || (isAttacking && currentAttacking < 3)) {
        team.push(player);
        positions[elementType]++;
      }
    }
    
    // If team is not complete, fill with any remaining available players
    if (team.length < 5) {
      for (const player of availablePlayers) {
        if (team.length >= 5) break;
        if (!team.find(p => p.id === player.id)) {
          team.push(player);
          positions[player.element_type]++;
        }
      }
    }
    
    if (team.length < 5) {
      throw new Error(`Could only generate team of ${team.length} players. Need 5.`);
    }
    
    return team;
  }

  // Update user teams in draft service
  async updateUserTeams(newTeams) {
    const draftData = this.draftService.draftData;
    
    for (const [userId, team] of Object.entries(newTeams)) {
      const user = draftData.users.find(u => u.id === parseInt(userId));
      if (user) {
        user.team = team.map(p => p.id);
        // Reset weekly selections
        user.activePlayers = [];
        user.benchedPlayer = null;
        user.captain = null;
      }
    }
    
    await this.draftService.saveDraftData();
  }

  // Simulate scores for a gameweek
  async simulateGameweek(gameweek) {
    if (!this.draftService.draftData.simulationMode) {
      throw new Error('Cannot simulate gameweek - simulation mode is disabled');
    }
    
    try {
      console.log(`⚽ Simulating Gameweek ${gameweek}...`);
      
      const draftData = this.draftService.getDraftStatus();
      const userScores = {};
      const playerScores = {};
      
      // Generate random scores for all Chelsea players
      for (const player of this.chelseaPlayers) {
        const baseScore = this.generatePlayerScore(player, gameweek);
        playerScores[player.id] = {
          playerId: player.id,
          playerName: player.web_name,
          position: player.position_short,
          points: baseScore,
          goals: Math.random() < 0.15 ? Math.floor(Math.random() * 3) : 0,
          assists: Math.random() < 0.20 ? Math.floor(Math.random() * 2) + 1 : 0,
          cleanSheet: (player.element_type === 1 || player.element_type === 2) ? Math.random() < 0.3 : false,
          bonus: Math.random() < 0.25 ? Math.floor(Math.random() * 3) + 1 : 0
        };
      }
      
      // Calculate team scores
      for (const user of draftData.users) {
        let totalScore = 0;
        const teamPlayerScores = [];
        
        // Ensure user has a valid gameweek team set (retain from previous week or auto-set default)
        await this.draftService.ensureGameweekTeamSet(user.id);
        
        // Use the user's gameweek team (now guaranteed to be set)
        const activePlayers = user.activePlayers;
        const captain = user.captain;
        
        for (const playerId of activePlayers) {
          const playerScore = playerScores[playerId];
          if (playerScore) {
            let points = playerScore.points;
            
            // Apply captain bonus (2x points)
            if (playerId === captain) {
              points *= 2;
              playerScore.isCaptain = true;
            }
            
            totalScore += points;
            teamPlayerScores.push({...playerScore, finalPoints: points});
          }
        }
        
        // Apply chip effects
        totalScore = await this.applyChipEffects(user.id, totalScore, gameweek, teamPlayerScores);
        
        userScores[user.id] = {
          userId: user.id,
          username: user.username,
          totalScore,
          playerScores: teamPlayerScores,
          activePlayers,
          captain,
          benchedPlayer: user.benchedPlayer
        };
        
        console.log(`📊 ${user.username}: ${totalScore} points`);
      }
      
      // Store gameweek scores in memory and persist to draft data
      const gameweekData = {
        gameweek,
        userScores,
        playerScores,
        timestamp: new Date().toISOString()
      };
      
      this.gameweekScores.set(gameweek, gameweekData);
      
      // Store in draft data for persistence
      const draftDataForPersistence = this.draftService.draftData;
      if (!draftDataForPersistence.simulationHistory) {
        draftDataForPersistence.simulationHistory = {};
      }
      draftDataForPersistence.simulationHistory[gameweek] = gameweekData;
      await this.draftService.saveDraftData();
      
      // Process chip drops for this gameweek
      await this.chipService.processGameweekChips(gameweek);
      
      return {
        success: true,
        gameweek,
        userScores: Object.values(userScores),
        playerScores,
        message: `Gameweek ${gameweek} simulated successfully`
      };
      
    } catch (error) {
      console.error('Error simulating gameweek:', error);
      throw error;
    }
  }

  // Generate realistic player score based on FPL data
  generatePlayerScore(player, gameweek) {
    const basePoints = 2; // Appearance points
    let points = basePoints;
    
    // Form-based variance using actual FPL form data
    const formModifier = (player.baseForm - 5) * 0.3;
    const randomness = (Math.random() - 0.5) * 4; // -2 to +2 variance
    
    // Position-based scoring using element_type
    switch (player.element_type) {
      case 1: // Goalkeeper
        points += Math.random() < 0.3 ? 4 : 0; // Clean sheet
        points += Math.random() < 0.1 ? 5 : 0; // Save points
        break;
      case 2: // Defender
        points += Math.random() < 0.3 ? 4 : 0; // Clean sheet
        points += Math.random() < 0.1 ? 6 : 0; // Goal
        points += Math.random() < 0.15 ? 3 : 0; // Assist
        break;
      case 3: // Midfielder
        points += Math.random() < 0.15 ? 5 : 0; // Goal
        points += Math.random() < 0.25 ? 3 : 0; // Assist
        points += Math.random() < 0.2 ? 1 : 0; // Passing points
        break;
      case 4: // Forward
        points += Math.random() < 0.25 ? 4 : 0; // Goal
        points += Math.random() < 0.2 ? 3 : 0; // Assist
        break;
    }
    
    // Bonus points
    if (Math.random() < 0.25) {
      points += Math.floor(Math.random() * 3) + 1;
    }
    
    // Apply modifiers
    points += formModifier + randomness;
    
    // Ensure minimum 0 points
    return Math.max(0, Math.round(points));
  }

  // Apply active chip effects to scores
  async applyChipEffects(userId, baseScore, gameweek, playerScores) {
    let finalScore = baseScore;
    
    // Get active chip effects for this gameweek
    const draftData = this.draftService.getDraftStatus();
    const chipHistory = draftData.chipHistory || [];
    
    const activeEffects = chipHistory.filter(chip => 
      chip.gameweek === gameweek
    );
    
    for (const effect of activeEffects) {
      switch (effect.chipName) {
        case 'Point Vampire':
          if (effect.targetUserId === userId) {
            // Lose 25% of points
            finalScore = Math.round(finalScore * 0.75);
            console.log(`🧛 ${draftData.users.find(u => u.id === userId)?.username} lost 25% points to Point Vampire`);
          } else if (effect.userId === userId) {
            // Gain 25% of target's points
            const targetScore = this.gameweekScores.get(gameweek)?.userScores[effect.targetUserId]?.totalScore || 0;
            const stolenPoints = Math.round(targetScore * 0.25);
            finalScore += stolenPoints;
            console.log(`🧛 ${draftData.users.find(u => u.id === userId)?.username} stole ${stolenPoints} points`);
          }
          break;
          
        case 'Bench Boost':
          if (effect.userId === userId) {
            // Add bench player points
            const user = draftData.users.find(u => u.id === userId);
            if (user?.benchedPlayer) {
              const benchPlayer = this.chelseaPlayers.find(p => p.id === user.benchedPlayer);
              if (benchPlayer) {
                const benchScore = this.generatePlayerScore(benchPlayer, gameweek);
                finalScore += benchScore;
                console.log(`💺 ${user.username} gained ${benchScore} bench points`);
              }
            }
          }
          break;
          
        case 'Reverse Psychology':
          // This would be handled after all scores are calculated
          break;
      }
    }
    
    return finalScore;
  }

  // Advance to next gameweek and update current gameweek
  async advanceGameweek() {
    if (!this.draftService.draftData.simulationMode) {
      throw new Error('Cannot advance gameweek - simulation mode is disabled');
    }
    
    const currentGW = await this.draftService.advanceSimulationGameweek();
    
    return {
      success: true,
      previousGameweek: currentGW - 1,
      currentGameweek: currentGW,
      message: `Advanced to Gameweek ${currentGW}`
    };
  }

  // Get simulation data and history
  getSimulationData() {
    const draftData = this.draftService.getDraftStatus();
    const gameweekHistory = [];
    
    for (const [gw, data] of this.gameweekScores.entries()) {
      gameweekHistory.push(data);
    }
    
    return {
      currentGameweek: draftData.currentGameweek || 1,
      isDraftComplete: draftData.isDraftComplete,
      users: draftData.users,
      gameweekHistory,
      totalGameweeks: 38
    };
  }

  // Reset simulation
  async resetSimulation() {
    // Clear gameweek scores and chip effects
    this.gameweekScores.clear();
    this.activeChipEffects.clear();
    
    // Reset draft data (this now includes simulation fields and history)
    await this.draftService.resetDraft();
    
    return {
      success: true,
      message: 'Simulation reset successfully - gameweek reset to 1'
    };
  }

  // Utility methods
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Get leaderboard across all simulated gameweeks
  getOverallLeaderboard() {
    const userTotals = {};
    const draftData = this.draftService.getDraftStatus();
    
    // Initialize user totals
    for (const user of draftData.users) {
      userTotals[user.id] = {
        userId: user.id,
        username: user.username,
        totalPoints: 0,
        gameweeksPlayed: 0
      };
    }
    
    // Sum up all gameweek scores
    for (const [gw, data] of this.gameweekScores.entries()) {
      for (const [userId, userScore] of Object.entries(data.userScores)) {
        const numericUserId = parseInt(userId);
        if (userTotals[numericUserId]) {
          userTotals[numericUserId].totalPoints += userScore.totalScore;
          userTotals[numericUserId].gameweeksPlayed++;
        }
      }
    }
    
    // Sort by total points
    return Object.values(userTotals).sort((a, b) => b.totalPoints - a.totalPoints);
  }
}

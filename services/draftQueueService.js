import { activityLogger } from './activityLoggerService.js';

class DraftQueueService {
  constructor() {
    this.draftQueue = [];
    this.currentTurn = 0;
    this.draftStatus = 'waiting'; // 'waiting', 'active', 'paused', 'completed'
    this.turnTimeLimit = 60000; // 60 seconds per turn
    this.turnTimer = null;
    this.autoPickEnabled = true;
    this.autoPickDelay = 30000; // 30 seconds before auto-pick
  }

  // Initialize draft queue with users
  initializeDraft(users, draftOrder = null) {
    try {
      // If no draft order specified, randomize
      if (!draftOrder) {
        draftOrder = this.generateRandomDraftOrder(users);
      }

      this.draftQueue = draftOrder.map((userId, index) => {
        const user = users.find(u => u.id === userId);
        return {
          userId: userId,
          username: user.username,
          position: index + 1,
          hasPicked: false,
          currentPick: null,
          timeRemaining: this.turnTimeLimit,
          isOnline: false,
          lastSeen: new Date()
        };
      });

      this.currentTurn = 0;
      this.draftStatus = 'waiting';
      
      console.log('✅ Draft queue initialized with', this.draftQueue.length, 'users');
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize draft queue:', error);
      return false;
    }
  }

  // Generate random draft order
  generateRandomDraftOrder(users) {
    const userIds = users.map(u => u.id);
    for (let i = userIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [userIds[i], userIds[j]] = [userIds[j], userIds[i]];
    }
    return userIds;
  }

  // Start the draft
  startDraft() {
    if (this.draftStatus !== 'waiting') {
      throw new Error('Draft is not in waiting status');
    }

    this.draftStatus = 'active';
    this.currentTurn = 0;
    this.startTurnTimer();
    
    console.log('🚀 Draft started! First turn:', this.getCurrentPlayer());
    
    // Log draft start
    this.logDraftEvent('DRAFT_STARTED', {
      totalPlayers: this.draftQueue.length,
      firstPlayer: this.getCurrentPlayer()
    });

    return this.getCurrentPlayer();
  }

  // Get current player
  getCurrentPlayer() {
    if (this.draftQueue.length === 0 || this.currentTurn >= this.draftQueue.length) {
      return null;
    }
    return this.draftQueue[this.currentTurn];
  }

  // Get next player
  getNextPlayer() {
    const nextTurn = this.currentTurn + 1;
    if (nextTurn >= this.draftQueue.length) {
      return null; // Draft completed
    }
    return this.draftQueue[nextTurn];
  }

  // Make a pick
  async makePick(userId, playerData) {
    try {
      const currentPlayer = this.getCurrentPlayer();
      
      if (!currentPlayer || currentPlayer.userId !== userId) {
        throw new Error('Not your turn to pick');
      }

      if (currentPlayer.hasPicked) {
        throw new Error('You have already made your pick');
      }

      // Record the pick
      currentPlayer.hasPicked = true;
      currentPlayer.currentPick = {
        player: playerData,
        timestamp: new Date(),
        timeTaken: this.turnTimeLimit - currentPlayer.timeRemaining
      };

      // Log the pick
      await activityLogger.logActivity(userId, currentPlayer.username, 'DRAFT_PICK', {
        player: playerData,
        position: currentPlayer.position,
        timeTaken: currentPlayer.timeRemaining,
        turnNumber: this.currentTurn + 1
      });

      console.log(`✅ ${currentPlayer.username} picked ${playerData.name}`);

      // Move to next turn
      this.moveToNextTurn();

      return {
        success: true,
        pick: currentPlayer.currentPick,
        nextPlayer: this.getCurrentPlayer(),
        draftProgress: this.getDraftProgress()
      };

    } catch (error) {
      console.error('❌ Failed to make pick:', error);
      throw error;
    }
  }

  // Move to next turn
  moveToNextTurn() {
    // Clear current turn timer
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }

    this.currentTurn++;

    // Check if draft is completed
    if (this.currentTurn >= this.draftQueue.length) {
      this.completeDraft();
      return;
    }

    // Start next turn
    this.startTurnTimer();
    
    const nextPlayer = this.getCurrentPlayer();
    console.log(`🔄 Turn ${this.currentTurn + 1}: ${nextPlayer.username}'s turn`);

    // Log turn change
    this.logDraftEvent('TURN_CHANGED', {
      newPlayer: nextPlayer,
      turnNumber: this.currentTurn + 1
    });

    return nextPlayer;
  }

  // Start turn timer
  startTurnTimer() {
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer) return;

    currentPlayer.timeRemaining = this.turnTimeLimit;
    
    this.turnTimer = setInterval(() => {
      currentPlayer.timeRemaining -= 1000;
      
      // Send time updates to connected clients
      this.broadcastTurnUpdate();
      
      // Auto-pick if time runs out
      if (currentPlayer.timeRemaining <= 0) {
        this.handleTimeOut();
      }
      
      // Auto-pick warning
      if (this.autoPickEnabled && currentPlayer.timeRemaining === this.autoPickDelay) {
        this.sendAutoPickWarning(currentPlayer);
      }
    }, 1000);
  }

  // Handle time out
  async handleTimeOut() {
    const currentPlayer = this.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.hasPicked) return;

    console.log(`⏰ Time out for ${currentPlayer.username}, auto-picking...`);

    // Auto-pick logic (pick best available player)
    const autoPick = this.getBestAvailablePlayer();
    
    if (autoPick) {
      await this.makePick(currentPlayer.userId, autoPick);
    } else {
      // Skip turn if no players available
      this.moveToNextTurn();
    }
  }

  // Get best available player (simplified logic)
  getBestAvailablePlayer() {
    // This would integrate with your existing player data
    // For now, return a placeholder
    return {
      id: 'auto-pick',
      name: 'Auto-Picked Player',
      position: 'MID',
      team: 'Chelsea'
    };
  }

  // Send auto-pick warning
  sendAutoPickWarning(player) {
    console.log(`⚠️ Auto-pick warning for ${player.username} in ${this.autoPickDelay / 1000} seconds`);
    
    // This would send a push notification or WebSocket message
    this.broadcastNotification({
      type: 'AUTO_PICK_WARNING',
      player: player,
      timeRemaining: this.autoPickDelay / 1000
    });
  }

  // Pause draft
  pauseDraft() {
    if (this.draftStatus !== 'active') {
      throw new Error('Draft is not active');
    }

    this.draftStatus = 'paused';
    
    // Clear turn timer
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }

    console.log('⏸️ Draft paused');
    
    this.logDraftEvent('DRAFT_PAUSED', {
      pausedBy: 'admin',
      currentPlayer: this.getCurrentPlayer()
    });

    return true;
  }

  // Resume draft
  resumeDraft() {
    if (this.draftStatus !== 'paused') {
      throw new Error('Draft is not paused');
    }

    this.draftStatus = 'active';
    this.startTurnTimer();
    
    console.log('▶️ Draft resumed');
    
    this.logDraftEvent('DRAFT_RESUMED', {
      resumedBy: 'admin',
      currentPlayer: this.getCurrentPlayer()
    });

    return true;
  }

  // Complete draft
  completeDraft() {
    this.draftStatus = 'completed';
    
    // Clear any remaining timers
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }

    console.log('🎉 Draft completed!');
    
    this.logDraftEvent('DRAFT_COMPLETED', {
      totalPicks: this.draftQueue.length,
      finalResults: this.getDraftResults()
    });

    return this.getDraftResults();
  }

  // Get draft progress
  getDraftProgress() {
    const totalPicks = this.draftQueue.length;
    const completedPicks = this.draftQueue.filter(p => p.hasPicked).length;
    const currentPlayer = this.getCurrentPlayer();
    
    return {
      totalPicks,
      completedPicks,
      remainingPicks: totalPicks - completedPicks,
      currentPlayer,
      nextPlayer: this.getNextPlayer(),
      status: this.draftStatus,
      progress: Math.round((completedPicks / totalPicks) * 100)
    };
  }

  // Get draft results
  getDraftResults() {
    return this.draftQueue.map(player => ({
      userId: player.userId,
      username: player.username,
      position: player.position,
      pick: player.currentPick,
      timeTaken: player.currentPick ? player.currentPick.timeTaken : null
    }));
  }

  // Update player online status
  updatePlayerStatus(userId, isOnline) {
    const player = this.draftQueue.find(p => p.userId === userId);
    if (player) {
      player.isOnline = isOnline;
      player.lastSeen = new Date();
    }
  }

  // Get player by ID
  getPlayerById(userId) {
    return this.draftQueue.find(p => p.userId === userId);
  }

  // Skip player's turn (admin function)
  async skipPlayerTurn(userId, reason = 'Admin skip') {
    const player = this.getPlayerById(userId);
    if (!player) {
      throw new Error('Player not found');
    }

    if (player.hasPicked) {
      throw new Error('Player has already made their pick');
    }

    // Mark as picked with skip reason
    player.hasPicked = true;
    player.currentPick = {
      player: { name: 'SKIPPED', reason },
      timestamp: new Date(),
      timeTaken: 0,
      skipped: true
    };

    // Log the skip
    await activityLogger.logActivity(userId, player.username, 'DRAFT_SKIP', {
      reason,
      position: player.position,
      turnNumber: this.currentTurn + 1
    });

    console.log(`⏭️ ${player.username}'s turn skipped: ${reason}`);

    // Move to next turn
    this.moveToNextTurn();

    return {
      success: true,
      skippedPlayer: player,
      nextPlayer: this.getCurrentPlayer()
    };
  }

  // Reset draft
  resetDraft() {
    this.draftQueue.forEach(player => {
      player.hasPicked = false;
      player.currentPick = null;
      player.timeRemaining = this.turnTimeLimit;
    });
    
    this.currentTurn = 0;
    this.draftStatus = 'waiting';
    
    if (this.turnTimer) {
      clearTimeout(this.turnTimer);
      this.turnTimer = null;
    }

    console.log('🔄 Draft reset');
    
    this.logDraftEvent('DRAFT_RESET', {
      resetBy: 'admin'
    });

    return true;
  }

  // Broadcast turn update (for WebSocket)
  broadcastTurnUpdate() {
    // This would be implemented with your WebSocket service
    const update = {
      type: 'TURN_UPDATE',
      data: this.getDraftProgress(),
      timestamp: new Date()
    };
    
    // Placeholder for WebSocket broadcast
    console.log('📡 Broadcasting turn update:', update);
  }

  // Broadcast notification (for WebSocket/Push)
  broadcastNotification(notification) {
    // This would be implemented with your notification service
    const message = {
      type: 'DRAFT_NOTIFICATION',
      data: notification,
      timestamp: new Date()
    };
    
    // Placeholder for notification broadcast
    console.log('📢 Broadcasting notification:', message);
  }

  // Log draft events
  async logDraftEvent(eventType, details) {
    try {
      await activityLogger.logActivity(0, 'SYSTEM', eventType, {
        draftId: 'main-draft',
        ...details,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to log draft event:', error);
    }
  }

  // Get draft status summary
  getStatusSummary() {
    return {
      status: this.draftStatus,
      currentTurn: this.currentTurn + 1,
      totalTurns: this.draftQueue.length,
      currentPlayer: this.getCurrentPlayer(),
      nextPlayer: this.getNextPlayer(),
      progress: this.getDraftProgress(),
      timeRemaining: this.getCurrentPlayer()?.timeRemaining || 0
    };
  }
}

export const draftQueueService = new DraftQueueService();


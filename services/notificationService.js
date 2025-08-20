import { activityLogger } from './activityLoggerService.js';

class NotificationService {
  constructor() {
    this.subscriptions = new Map();
  }

  /**
   * Subscribe a user to notifications
   * @param {number} userId - User ID
   * @param {Object} subscription - Push notification subscription
   */
  subscribeUser(userId, subscription) {
    this.subscriptions.set(userId, subscription);
  }

  /**
   * Unsubscribe a user from notifications
   * @param {number} userId - User ID
   */
  unsubscribeUser(userId) {
    this.subscriptions.delete(userId);
  }

  /**
   * Check if user wants a specific notification type
   * @param {Object} user - User object with notification preferences
   * @param {string} notificationType - Type of notification
   * @returns {boolean} - Whether user wants this notification
   */
  shouldSendNotification(user, notificationType) {
    if (!user || !user.notificationPreferences) {
      return true; // Default to sending if no preferences set
    }

    const prefs = user.notificationPreferences;
    
    switch (notificationType) {
      case 'deadline_reminder':
        return prefs.deadlineReminders && (prefs.emailNotifications || prefs.pushNotifications);
      
      case 'deadline_summary':
        return prefs.deadlineSummaries && (prefs.emailNotifications || prefs.pushNotifications);
      
      case 'transfer_confirmation':
        return prefs.transferNotifications && (prefs.emailNotifications || prefs.pushNotifications);
      
      case 'chip_usage':
        return prefs.chipNotifications && (prefs.emailNotifications || prefs.pushNotifications);
      
      case 'live_score_update':
        return prefs.liveScoreUpdates && (prefs.emailNotifications || prefs.pushNotifications);
      
      case 'weekly_report':
        return prefs.weeklyReports && (prefs.emailNotifications || prefs.pushNotifications);
      
      default:
        return true;
    }
  }

  /**
   * Send deadline reminder notification
   * @param {Object} user - User object
   * @param {Object} deadlineData - Deadline information
   */
  async sendDeadlineReminder(user, deadlineData) {
    if (!this.shouldSendNotification(user, 'deadline_reminder')) {
      return;
    }

    const notification = {
      type: 'deadline_reminder',
      title: '⏰ Transfer Deadline Reminder',
      body: `Gameweek ${deadlineData.gameweek} closes in ${deadlineData.timeRemaining}`,
      data: {
        gameweek: deadlineData.gameweek,
        deadline: deadlineData.deadline,
        timeRemaining: deadlineData.timeRemaining,
        url: '/draft'
      },
      icon: '/logo192.png'
    };

    await this.sendNotification(user, notification);
  }

  /**
   * Send deadline summary notification
   * @param {Object} user - User object
   * @param {Object} summaryData - Summary information
   */
  async sendDeadlineSummary(user, summaryData) {
    if (!this.shouldSendNotification(user, 'deadline_summary')) {
      return;
    }

    const notification = {
      type: 'deadline_summary',
      title: '🏆 Deadline Summary Available',
      body: `Gameweek ${summaryData.gameweek} deadline report is ready!`,
      data: {
        gameweek: summaryData.gameweek,
        summary: summaryData.summary,
        url: '/draft'
      },
      icon: '/logo192.png'
    };

    await this.sendNotification(user, notification);
  }

  /**
   * Send transfer confirmation notification
   * @param {Object} user - User object
   * @param {Object} transferData - Transfer information
   */
  async sendTransferConfirmation(user, transferData) {
    if (!this.shouldSendNotification(user, 'transfer_confirmation')) {
      return;
    }

    const notification = {
      type: 'transfer_confirmation',
      title: '🔄 Transfer Confirmed',
      body: `Your transfer has been processed successfully`,
      data: {
        transferId: transferData.id,
        playerOut: transferData.playerOut,
        playerIn: transferData.playerIn,
        url: '/draft'
      },
      icon: '/logo192.png'
    };

    await this.sendNotification(user, notification);
  }

  /**
   * Send chip usage notification
   * @param {Object} user - User object
   * @param {Object} chipData - Chip usage information
   */
  async sendChipUsageNotification(user, chipData) {
    if (!this.shouldSendNotification(user, 'chip_usage')) {
      return;
    }

    const notification = {
      type: 'chip_usage',
      title: '🎴 Chip Activated',
      body: `${chipData.chipName} has been used successfully`,
      data: {
        chipId: chipData.id,
        chipName: chipData.chipName,
        gameweek: chipData.gameweek,
        url: '/draft'
      },
      icon: '/logo192.png'
    };

    await this.sendNotification(user, notification);
  }

  /**
   * Send live score update notification
   * @param {Object} user - User object
   * @param {Object} scoreData - Score update information
   */
  async sendLiveScoreUpdate(user, scoreData) {
    if (!this.shouldSendNotification(user, 'live_score_update')) {
      return;
    }

    const notification = {
      type: 'live_score_update',
      title: '⚽ Live Score Update',
      body: `${scoreData.playerName} has scored!`,
      data: {
        playerId: scoreData.playerId,
        playerName: scoreData.playerName,
        points: scoreData.points,
        url: '/live-scores'
      },
      icon: '/logo192.png'
    };

    await this.sendNotification(user, notification);
  }

  /**
   * Send weekly report notification
   * @param {Object} user - User object
   * @param {Object} reportData - Weekly report information
   */
  async sendWeeklyReport(user, reportData) {
    if (!this.shouldSendNotification(user, 'weekly_report')) {
      return;
    }

    const notification = {
      type: 'weekly_report',
      title: '📊 Weekly Report Available',
      body: `Your Gameweek ${reportData.gameweek} performance report is ready!`,
      data: {
        gameweek: reportData.gameweek,
        points: reportData.points,
        position: reportData.position,
        url: '/stats'
      },
      icon: '/logo192.png'
    };

    await this.sendNotification(user, notification);
  }

  /**
   * Send notification to user based on their preferences
   * @param {Object} user - User object
   * @param {Object} notification - Notification data
   */
  async sendNotification(user, notification) {
    try {
      // Log notification activity
      await activityLogger.logActivity(user.id, user.username, 'NOTIFICATION_SENT', {
        type: notification.type,
        title: notification.title,
        body: notification.body,
        timestamp: new Date().toISOString()
      });

      // Send push notification if user has enabled it
      if (user.notificationPreferences?.pushNotifications) {
        await this.sendPushNotification(user.id, notification);
      }

      // Send email notification if user has enabled it
      if (user.notificationPreferences?.emailNotifications) {
        await this.sendEmailNotification(user, notification);
      }

      console.log(`📱 Notification sent to user ${user.username}: ${notification.title}`);
    } catch (error) {
      console.error(`Failed to send notification to user ${user.username}:`, error);
    }
  }

  /**
   * Send push notification
   * @param {number} userId - User ID
   * @param {Object} notification - Notification data
   */
  async sendPushNotification(userId, notification) {
    const subscription = this.subscriptions.get(userId);
    if (!subscription) {
      return; // User not subscribed to push notifications
    }

    // This would integrate with your push notification service
    // For now, we'll just log it
    console.log(`📱 Push notification would be sent to user ${userId}:`, notification);
  }

  /**
   * Send email notification
   * @param {Object} user - User object
   * @param {Object} notification - Notification data
   */
  async sendEmailNotification(user, notification) {
    // This would integrate with your email service
    // For now, we'll just log it
    if (user.email) {
      console.log(`📧 Email notification would be sent to ${user.email}:`, notification);
    } else {
      console.log(`📧 Email notification would be sent but user has no email address:`, notification);
    }
  }

  /**
   * Get user notification preferences
   * @param {number} userId - User ID
   * @returns {Object} - Notification preferences
   */
  getUserNotificationPreferences(userId) {
    // This would typically come from the user service
    // For now, return default preferences
    return {
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
}

export default new NotificationService();

import express from 'express';
import webpush from 'web-push';
import { activityLogger } from '../services/activityLoggerService.js';

const router = express.Router();

// VAPID keys - generate these for production
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'your-vapid-public-key';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'your-vapid-private-key';

// Only set VAPID details if we have valid keys
if (VAPID_PUBLIC_KEY !== 'your-vapid-public-key' && VAPID_PRIVATE_KEY !== 'your-vapid-private-key') {
  try {
    webpush.setVapidDetails(
      'mailto:your-email@domain.com',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
  } catch (error) {
    console.warn('⚠️ Invalid VAPID keys, push notifications will be disabled:', error.message);
  }
} else {
  console.warn('⚠️ VAPID keys not configured, push notifications will be disabled');
}

// Store subscriptions (in production, use database)
const subscriptions = new Map();

// Subscribe to push notifications
router.post('/subscribe', async (req, res) => {
  try {
    const { subscription, userId } = req.body;
    
    if (!subscription || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Subscription and userId are required'
      });
    }

    // Store subscription
    subscriptions.set(userId, subscription);
    
    // Log subscription activity
    await activityLogger.logActivity(userId, 'PUSH_SUBSCRIBE', {
      endpoint: subscription.endpoint,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Successfully subscribed to push notifications'
    });
  } catch (error) {
    console.error('Failed to subscribe:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to subscribe to push notifications'
    });
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'UserId is required'
      });
    }

    // Remove subscription
    subscriptions.delete(userId);
    
    // Log unsubscription activity
    await activityLogger.logActivity(userId, 'PUSH_UNSUBSCRIBE', {
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Successfully unsubscribed from push notifications'
    });
  } catch (error) {
    console.error('Failed to unsubscribe:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unsubscribe from push notifications'
    });
  }
});

// Send push notification to specific user
router.post('/send/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { title, body, data, icon } = req.body;
    
    const subscription = subscriptions.get(userId);
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'User not subscribed to push notifications'
      });
    }

    // Check if VAPID keys are configured
    if (VAPID_PUBLIC_KEY === 'your-vapid-public-key' || VAPID_PRIVATE_KEY === 'your-vapid-private-key') {
      return res.status(503).json({
        success: false,
        error: 'Push notifications not configured (VAPID keys missing)'
      });
    }

    const payload = JSON.stringify({
      title: title || 'FPL Tracker Update',
      body: body || 'You have a new update!',
      icon: icon || '/logo192.png',
      data: data || {},
      timestamp: new Date().toISOString()
    });

    await webpush.sendNotification(subscription, payload);
    
    // Log notification sent
    await activityLogger.logActivity(userId, 'PUSH_SENT', {
      title,
      body,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Push notification sent successfully'
    });
  } catch (error) {
    console.error('Failed to send push notification:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send push notification'
    });
  }
});

// Send push notification to all subscribers
router.post('/broadcast', async (req, res) => {
  try {
    const { title, body, data, icon } = req.body;
    
    if (subscriptions.size === 0) {
      return res.json({
        success: true,
        message: 'No subscribers to notify',
        count: 0
      });
    }

    // Check if VAPID keys are configured
    if (VAPID_PUBLIC_KEY === 'your-vapid-public-key' || VAPID_PRIVATE_KEY === 'your-vapid-private-key') {
      return res.status(503).json({
        success: false,
        error: 'Push notifications not configured (VAPID keys missing)'
      });
    }

    const payload = JSON.stringify({
      title: title || 'FPL Tracker Update',
      body: body || 'You have a new update!',
      icon: icon || '/logo192.png',
      data: data || {},
      timestamp: new Date().toISOString()
    });

    let successCount = 0;
    const errors = [];

    // Send to all subscribers
    for (const [userId, subscription] of subscriptions.entries()) {
      try {
        await webpush.sendNotification(subscription, payload);
        successCount++;
        
        // Log notification sent
        await activityLogger.logActivity(userId, 'PUSH_BROADCAST', {
          title,
          body,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        errors.push({ userId, error: error.message });
        // Remove invalid subscription
        subscriptions.delete(userId);
      }
    }

    res.json({
      success: true,
      message: `Push notifications sent to ${successCount} users`,
      count: successCount,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Failed to broadcast push notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to broadcast push notifications'
    });
  }
});

// Get VAPID public key
router.get('/vapid-public-key', (req, res) => {
  res.json({
    success: true,
    vapidPublicKey: VAPID_PUBLIC_KEY
  });
});

// Get subscription status for user
router.get('/status/:userId', (req, res) => {
  const { userId } = req.params;
  const isSubscribed = subscriptions.has(userId);
  
  res.json({
    success: true,
    isSubscribed,
    subscription: isSubscribed ? subscriptions.get(userId) : null
  });
});

// Get all subscriptions (admin only)
router.get('/subscriptions', (req, res) => {
  const subscriptionList = Array.from(subscriptions.entries()).map(([userId, subscription]) => ({
    userId,
    endpoint: subscription.endpoint,
    keys: subscription.keys
  }));
  
  res.json({
    success: true,
    count: subscriptionList.length,
    subscriptions: subscriptionList
  });
});

export default router;

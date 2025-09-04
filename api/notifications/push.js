import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  'mailto:your-email@example.com', // Replace with your email
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { action } = req.query;

    switch (action) {
      case 'subscribe':
        return await handleSubscribe(req, res);
      case 'unsubscribe':
        return await handleUnsubscribe(req, res);
      case 'send':
        return await handleSendPush(req, res);
      case 'permission-status':
        return await handlePermissionStatus(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Push notifications API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function handleSubscribe(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, subscription } = req.body;

  if (!userId || !subscription) {
    return res.status(400).json({ error: 'User ID and subscription required' });
  }

  // Store the push subscription
  const { data: pushSubscription, error } = await supabase
    .from('user_push_subscriptions')
    .upsert({
      user_id: userId,
      endpoint: subscription.endpoint,
      p256dh_key: subscription.keys.p256dh,
      auth_key: subscription.keys.auth,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  // Update notification preferences to enable push notifications
  await supabase
    .from('user_notification_preferences')
    .upsert({
      user_id: userId,
      push_notifications_enabled: true,
      push_draft_updates: true,
      push_gameweek_results: true,
      push_transfer_notifications: true,
      updated_at: new Date().toISOString()
    });

  res.status(200).json({
    success: true,
    message: 'Successfully subscribed to push notifications',
    data: pushSubscription
  });
}

async function handleUnsubscribe(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, endpoint } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }

  // Remove push subscription
  const { error } = await supabase
    .from('user_push_subscriptions')
    .delete()
    .eq('user_id', userId)
    .eq('endpoint', endpoint);

  if (error) {
    throw error;
  }

  // Update notification preferences to disable push notifications
  await supabase
    .from('user_notification_preferences')
    .upsert({
      user_id: userId,
      push_notifications_enabled: false,
      updated_at: new Date().toISOString()
    });

  res.status(200).json({
    success: true,
    message: 'Successfully unsubscribed from push notifications'
  });
}

async function handleSendPush(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, userId, data } = req.body;

  if (!type || !userId) {
    return res.status(400).json({ error: 'Type and user ID required' });
  }

  // Get user's push subscription
  const { data: subscription, error: subError } = await supabase
    .from('user_push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (subError || !subscription) {
    return res.status(200).json({ 
      success: true, 
      message: 'No push subscription found for user',
      sent: false 
    });
  }

  // Check if user has push notifications enabled
  const { data: preferences, error: prefsError } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (prefsError || !preferences?.push_notifications_enabled) {
    return res.status(200).json({ 
      success: true, 
      message: 'Push notifications disabled for user',
      sent: false 
    });
  }

  // Generate push notification payload
  const payload = generatePushPayload(type, data);

  // Send push notification
  try {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh_key,
        auth: subscription.auth_key
      }
    };

    await webpush.sendNotification(pushSubscription, JSON.stringify(payload));

    // Log the notification
    await supabase
      .from('notification_logs')
      .insert({
        user_id: userId,
        notification_type: 'push',
        notification_subtype: type,
        status: 'sent',
        sent_at: new Date().toISOString()
      });

    res.status(200).json({
      success: true,
      message: 'Push notification sent successfully'
    });

  } catch (error) {
    console.error('Push notification failed:', error);
    
    // If subscription is invalid, remove it
    if (error.statusCode === 410) {
      await supabase
        .from('user_push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', subscription.endpoint);
    }

    res.status(500).json({ error: 'Failed to send push notification' });
  }
}

async function handlePermissionStatus(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }

  // Check if user has push subscription
  const { data: subscription, error: subError } = await supabase
    .from('user_push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Check notification preferences
  const { data: preferences, error: prefsError } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  const status = {
    hasSubscription: !subError && !!subscription,
    pushEnabled: !prefsError && !!preferences?.push_notifications_enabled,
    permission: subscription ? 'granted' : 'not-granted'
  };

  res.status(200).json({
    success: true,
    data: status
  });
}

function generatePushPayload(type, data) {
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
  
  switch (type) {
    case 'draft_update':
      return {
        title: '🏆 New Player Allocated!',
        body: `${data.playerName} has been added to your team`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-144x144.png',
        url: `${baseUrl}/teams`,
        tag: 'draft-update',
        data: {
          type: 'draft_update',
          playerName: data.playerName,
          playerPosition: data.playerPosition,
          playerPrice: data.playerPrice
        }
      };

    case 'gameweek_results':
      return {
        title: '⚽ Gameweek Results!',
        body: `You scored ${data.totalPoints} points this gameweek`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-144x144.png',
        url: `${baseUrl}/simulation`,
        tag: 'gameweek-results',
        data: {
          type: 'gameweek_results',
          gameweek: data.gameweek,
          totalPoints: data.totalPoints,
          position: data.position
        }
      };

    case 'transfer_notification':
      return {
        title: '🔄 Transfer Alert!',
        body: `${data.playerName} has been transferred`,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-144x144.png',
        url: `${baseUrl}/teams`,
        tag: 'transfer-notification',
        data: {
          type: 'transfer_notification',
          playerName: data.playerName,
          fromUser: data.fromUser,
          toUser: data.toUser
        }
      };

    default:
      return {
        title: 'FPL Notification',
        body: 'You have a new FPL notification',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-144x144.png',
        url: baseUrl,
        tag: 'general-notification'
      };
  }
}

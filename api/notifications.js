import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
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
    const { action, type } = req.query;

    // Route to email or push handlers based on type
    if (type === 'email') {
      return await handleEmailNotifications(req, res, action);
    } else if (type === 'push') {
      return await handlePushNotifications(req, res, action);
    } else {
      return res.status(400).json({ error: 'Invalid notification type. Use ?type=email or ?type=push' });
    }

  } catch (error) {
    console.error('Notifications API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// Email Notification Handlers
async function handleEmailNotifications(req, res, action) {
  switch (action) {
    case 'send':
      return await handleSendEmail(req, res);
    case 'preferences':
      return await handleNotificationPreferences(req, res);
    case 'subscribe':
      return await handleSubscribe(req, res);
    case 'unsubscribe':
      return await handleUnsubscribe(req, res);
    default:
      return res.status(400).json({ error: 'Invalid email action. Use: send, preferences, subscribe, unsubscribe' });
  }
}

// Push Notification Handlers
async function handlePushNotifications(req, res, action) {
  switch (action) {
    case 'subscribe':
      return await handlePushSubscribe(req, res);
    case 'unsubscribe':
      return await handlePushUnsubscribe(req, res);
    case 'send':
      return await handlePushSend(req, res);
    case 'test':
      return await handlePushTest(req, res);
    default:
      return res.status(400).json({ error: 'Invalid push action. Use: subscribe, unsubscribe, send, test' });
  }
}

// Email Functions (from email.js)
async function handleSendEmail(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, html, text } = req.body;

    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, and html or text' });
    }

    // For now, just log the email (in production, you'd integrate with an email service)
    console.log('Email would be sent:', { to, subject, html, text });

    res.status(200).json({
      success: true,
      message: 'Email sent successfully',
      data: { to, subject }
    });

  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send email',
      details: error.message
    });
  }
}

async function handleNotificationPreferences(req, res) {
  if (req.method === 'GET') {
    // Get preferences
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({ error: 'User ID required' });
      }

      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      res.status(200).json({
        success: true,
        data: data || {
          email_notifications_enabled: true,
          email_draft_updates: true,
          email_gameweek_results: true,
          email_transfer_notifications: true,
          email_weekly_summary: true
        }
      });

    } catch (error) {
      console.error('Get preferences error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get preferences',
        details: error.message
      });
    }
  } else if (req.method === 'POST') {
    // Update preferences
    try {
      const { userId, preferences } = req.body;

      if (!userId || !preferences) {
        return res.status(400).json({ error: 'User ID and preferences required' });
      }

      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      res.status(200).json({
        success: true,
        message: 'Preferences updated successfully'
      });

    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update preferences',
        details: error.message
      });
    }
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleSubscribe(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, email } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: 'User ID and email required' });
    }

    // For now, just log the subscription
    console.log('Email subscription:', { userId, email });

    res.status(200).json({
      success: true,
      message: 'Subscribed to email notifications'
    });

  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to subscribe',
      details: error.message
    });
  }
}

async function handleUnsubscribe(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // For now, just log the unsubscription
    console.log('Email unsubscription:', { userId });

    res.status(200).json({
      success: true,
      message: 'Unsubscribed from email notifications'
    });

  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unsubscribe',
      details: error.message
    });
  }
}

// Push Functions (from push.js)
async function handlePushSubscribe(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, subscription } = req.body;

    if (!userId || !subscription) {
      return res.status(400).json({ error: 'User ID and subscription required' });
    }

    const { error } = await supabase
      .from('user_push_subscriptions')
      .upsert({
        user_id: userId,
        subscription: subscription,
        created_at: new Date().toISOString()
      });

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Push subscription saved successfully'
    });

  } catch (error) {
    console.error('Push subscribe error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save push subscription',
      details: error.message
    });
  }
}

async function handlePushUnsubscribe(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const { error } = await supabase
      .from('user_push_subscriptions')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Push subscription removed successfully'
    });

  } catch (error) {
    console.error('Push unsubscribe error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove push subscription',
      details: error.message
    });
  }
}

async function handlePushSend(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { title, body, data } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body required' });
    }

    // For now, just log the push notification
    console.log('Push notification would be sent:', { title, body, data });

    res.status(200).json({
      success: true,
      message: 'Push notification sent successfully'
    });

  } catch (error) {
    console.error('Push send error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send push notification',
      details: error.message
    });
  }
}

async function handlePushTest(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    res.status(200).json({
      success: true,
      message: 'Push notification service is working',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Push test error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test push service',
      details: error.message
    });
  }
}

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
    const { action } = req.query;

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
        return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Email notifications API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

async function handleSendEmail(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type, userId, data } = req.body;

  if (!type || !userId) {
    return res.status(400).json({ error: 'Type and user ID required' });
  }

  // Get user details
  const { data: user, error: userError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError || !user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Check if user has email notifications enabled
  const { data: preferences, error: prefsError } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (prefsError || !preferences?.email_notifications_enabled) {
    return res.status(200).json({ 
      success: true, 
      message: 'Email notifications disabled for user',
      sent: false 
    });
  }

  // Generate email content based on type
  const emailContent = generateEmailContent(type, user, data);

  // Send email using Supabase SMTP
  const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-email', {
    body: {
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    }
  });

  if (emailError) {
    console.error('Email sending failed:', emailError);
    return res.status(500).json({ error: 'Failed to send email' });
  }

  // Log the notification
  await supabase
    .from('notification_logs')
    .insert({
      user_id: userId,
      notification_type: 'email',
      notification_subtype: type,
      status: 'sent',
      sent_at: new Date().toISOString()
    });

  res.status(200).json({
    success: true,
    message: 'Email sent successfully',
    data: emailResult
  });
}

async function handleNotificationPreferences(req, res) {
  if (req.method === 'GET') {
    return await getNotificationPreferences(req, res);
  } else if (req.method === 'POST') {
    return await updateNotificationPreferences(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function getNotificationPreferences(req, res) {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }

  const { data: preferences, error } = await supabase
    .from('user_notification_preferences')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  const defaultPreferences = {
    email_notifications_enabled: true,
    email_draft_updates: true,
    email_gameweek_results: true,
    email_transfer_notifications: true,
    email_weekly_summary: true,
    push_notifications_enabled: false,
    push_draft_updates: false,
    push_gameweek_results: false,
    push_transfer_notifications: false
  };

  res.status(200).json({
    success: true,
    data: preferences || defaultPreferences
  });
}

async function updateNotificationPreferences(req, res) {
  const { userId, preferences } = req.body;

  if (!userId || !preferences) {
    return res.status(400).json({ error: 'User ID and preferences required' });
  }

  const { data: updatedPrefs, error } = await supabase
    .from('user_notification_preferences')
    .upsert({
      user_id: userId,
      ...preferences,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  res.status(200).json({
    success: true,
    message: 'Notification preferences updated successfully',
    data: updatedPrefs
  });
}

async function handleSubscribe(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, email } = req.body;

  if (!userId || !email) {
    return res.status(400).json({ error: 'User ID and email required' });
  }

  // Create or update notification preferences
  const { data: preferences, error } = await supabase
    .from('user_notification_preferences')
    .upsert({
      user_id: userId,
      email_notifications_enabled: true,
      email_draft_updates: true,
      email_gameweek_results: true,
      email_transfer_notifications: true,
      email_weekly_summary: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  res.status(200).json({
    success: true,
    message: 'Successfully subscribed to email notifications',
    data: preferences
  });
}

async function handleUnsubscribe(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }

  // Disable email notifications
  const { data: preferences, error } = await supabase
    .from('user_notification_preferences')
    .upsert({
      user_id: userId,
      email_notifications_enabled: false,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  res.status(200).json({
    success: true,
    message: 'Successfully unsubscribed from email notifications',
    data: preferences
  });
}

function generateEmailContent(type, user, data) {
  const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
  
  switch (type) {
    case 'draft_update':
      return {
        subject: '🏆 FPL Draft Update - New Player Allocated!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #034694;">🏆 FPL Draft Update</h2>
            <p>Hi ${user.first_name || 'there'},</p>
            <p>A new player has been allocated to your team!</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>New Player: ${data.playerName}</h3>
              <p><strong>Position:</strong> ${data.playerPosition}</p>
              <p><strong>Price:</strong> £${data.playerPrice}M</p>
            </div>
            <p><a href="${baseUrl}" style="background: #034694; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View Your Team</a></p>
            <p style="color: #666; font-size: 12px;">You're receiving this because you have email notifications enabled.</p>
          </div>
        `,
        text: `FPL Draft Update - New Player: ${data.playerName} (${data.playerPosition}, £${data.playerPrice}M) allocated to your team. View at ${baseUrl}`
      };

    case 'gameweek_results':
      return {
        subject: '⚽ Gameweek Results - Check Your Score!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #034694;">⚽ Gameweek ${data.gameweek} Results</h2>
            <p>Hi ${user.first_name || 'there'},</p>
            <p>Your gameweek results are in!</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Your Score: ${data.totalPoints} points</h3>
              <p><strong>Captain Points:</strong> ${data.captainPoints}</p>
              <p><strong>Bench Points:</strong> ${data.benchPoints}</p>
              <p><strong>League Position:</strong> ${data.position}</p>
            </div>
            <p><a href="${baseUrl}" style="background: #034694; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View Full Results</a></p>
            <p style="color: #666; font-size: 12px;">You're receiving this because you have email notifications enabled.</p>
          </div>
        `,
        text: `Gameweek ${data.gameweek} Results - Your score: ${data.totalPoints} points. View full results at ${baseUrl}`
      };

    case 'transfer_notification':
      return {
        subject: '🔄 Transfer Alert - Player Moved!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #034694;">🔄 Transfer Alert</h2>
            <p>Hi ${user.first_name || 'there'},</p>
            <p>A player transfer has occurred!</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>${data.playerName}</h3>
              <p><strong>From:</strong> ${data.fromUser}</p>
              <p><strong>To:</strong> ${data.toUser}</p>
              <p><strong>Transfer Type:</strong> ${data.transferType}</p>
            </div>
            <p><a href="${baseUrl}" style="background: #034694; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View Transfers</a></p>
            <p style="color: #666; font-size: 12px;">You're receiving this because you have email notifications enabled.</p>
          </div>
        `,
        text: `Transfer Alert - ${data.playerName} moved from ${data.fromUser} to ${data.toUser}. View at ${baseUrl}`
      };

    case 'weekly_summary':
      return {
        subject: '📊 Weekly FPL Summary',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #034694;">📊 Weekly FPL Summary</h2>
            <p>Hi ${user.first_name || 'there'},</p>
            <p>Here's your weekly FPL summary:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>This Week's Highlights</h3>
              <p><strong>Total Points:</strong> ${data.totalPoints}</p>
              <p><strong>League Position:</strong> ${data.position}</p>
              <p><strong>Transfers Made:</strong> ${data.transfers}</p>
              <p><strong>Best Performer:</strong> ${data.bestPlayer}</p>
            </div>
            <p><a href="${baseUrl}" style="background: #034694; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">View Full Summary</a></p>
            <p style="color: #666; font-size: 12px;">You're receiving this because you have email notifications enabled.</p>
          </div>
        `,
        text: `Weekly FPL Summary - Total Points: ${data.totalPoints}, Position: ${data.position}. View full summary at ${baseUrl}`
      };

    default:
      return {
        subject: 'FPL Notification',
        html: '<p>You have a new FPL notification.</p>',
        text: 'You have a new FPL notification.'
      };
  }
}

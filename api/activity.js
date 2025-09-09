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
    const { action, userId } = req.query;

    switch (action) {
      case 'user':
        return await handleUserActivity(req, res, userId);
      case 'recent':
        return await handleRecentActivity(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('❌ Activity API error:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Request details:', { method: req.method, url: req.url, query: req.query });
    
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

async function handleUserActivity(req, res, userId) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!userId) {
    return res.status(400).json({ error: 'User ID required' });
  }

  // Get user activity from user_activity table
  const { data: activity, error: activityError } = await supabase
    .from('user_activity')
    .select(`
      *,
      user:user_profiles!user_activity_user_id_fkey(id, first_name, last_name, email)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (activityError) {
    throw activityError;
  }

  // Get user stats
  const { data: user, error: userError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (userError) {
    throw userError;
  }

  // Calculate stats
  const stats = {
    totalActions: activity.length,
    loginCount: activity.filter(a => a.action_type === 'login').length,
    transferCount: activity.filter(a => a.action_type === 'transfer').length,
    lastActivity: activity[0]?.created_at || null
  };

  res.status(200).json({
    success: true,
    data: {
      user,
      activity,
      stats
    }
  });
}

async function handleRecentActivity(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🔍 Fetching recent activity...');
    
    // Try to get recent activity from all users
    const { data: activity, error: activityError } = await supabase
      .from('user_activity')
      .select(`
        *,
        user:user_profiles!user_activity_user_id_fkey(id, first_name, last_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (activityError) {
      console.error('❌ Activity query error:', activityError);
      
      // If table doesn't exist or has permission issues, return empty array
      if (activityError.message?.includes('relation "user_activity" does not exist') || 
          activityError.message?.includes('PGRST200') ||
          activityError.message?.includes('permission denied')) {
        console.log('ℹ️ user_activity table issue, returning empty array');
        return res.status(200).json({
          success: true,
          data: { activity: [] }
        });
      }
      
      throw activityError;
    }

    console.log('✅ Recent activity fetched successfully:', activity?.length || 0, 'activities');

    res.status(200).json({
      success: true,
      data: { activity: activity || [] }
    });
  } catch (error) {
    console.error('❌ handleRecentActivity error:', error);
    
    // Always return empty array instead of error for better UX
    console.log('ℹ️ Returning empty activity array due to error');
    res.status(200).json({
      success: true,
      data: { activity: [] }
    });
  }
}

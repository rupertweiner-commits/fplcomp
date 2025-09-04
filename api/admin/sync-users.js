import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for admin operations
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if user is admin
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile?.is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Run the sync function
    const { data, error } = await supabase.rpc('sync_existing_auth_users');

    if (error) {
      throw error;
    }

    // Get sync status
    const { data: syncStatus, error: statusError } = await supabase.rpc('check_user_sync_status');

    if (statusError) {
      console.warn('Failed to get sync status:', statusError);
    }

    res.status(200).json({
      success: true,
      message: 'Users synced successfully',
      syncStatus: syncStatus || []
    });

  } catch (error) {
    console.error('Failed to sync users:', error);
    res.status(500).json({ 
      error: 'Failed to sync users',
      details: error.message 
    });
  }
}

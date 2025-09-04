import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for admin operations
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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

    // Get sync status
    const { data: syncStatus, error: statusError } = await supabase.rpc('check_user_sync_status');

    if (statusError) {
      throw statusError;
    }

    // Count different sync statuses
    const stats = {
      total: syncStatus.length,
      synced: syncStatus.filter(s => s.sync_status === 'SYNCED').length,
      missing: syncStatus.filter(s => s.sync_status === 'MISSING_IN_PUBLIC').length,
      mismatched: syncStatus.filter(s => s.sync_status === 'EMAIL_MISMATCH').length
    };

    res.status(200).json({
      success: true,
      data: {
        stats,
        details: syncStatus
      }
    });

  } catch (error) {
    console.error('Failed to get sync status:', error);
    res.status(500).json({ 
      error: 'Failed to get sync status',
      details: error.message 
    });
  }
}

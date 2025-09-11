// API endpoint to manually sync users between auth.users and user_profiles
// This can be called if automatic sync fails

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role for admin operations
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Call the sync function
    const { data, error } = await supabase.rpc('sync_all_auth_users');

    if (error) {
      throw error;
    }

    // Get sync status
    const { data: status, error: statusError } = await supabase.rpc('check_user_sync_status');

    if (statusError) {
      throw statusError;
    }

    res.status(200).json({
      success: true,
      message: 'Users synced successfully',
      syncStatus: status[0]
    });

  } catch (error) {
    console.error('Error syncing users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync users',
      details: error.message
    });
  }
}

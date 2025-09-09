import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('🔍 Debug auth endpoint called');

    // Test 1: Check Supabase connection
    const { data: testData, error: testError } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('❌ Supabase connection test failed:', testError);
      return res.status(500).json({ 
        error: 'Supabase connection failed', 
        details: testError.message 
      });
    }

    console.log('✅ Supabase connection successful');

    // Test 2: Check if user exists in user_profiles
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', 'rupertweiner@gmail.com')
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Error querying user profile:', profileError);
      return res.status(500).json({ 
        error: 'Failed to query user profile', 
        details: profileError.message 
      });
    }

    // Test 3: List all users from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error listing auth users:', authError);
      return res.status(500).json({ 
        error: 'Failed to list auth users', 
        details: authError.message 
      });
    }

    const rupertUser = authUsers.users.find(user => user.email === 'rupertweiner@gmail.com');

    res.status(200).json({
      success: true,
      data: {
        supabaseConnection: 'OK',
        userProfileExists: !!userProfile,
        userProfile: userProfile,
        authUserExists: !!rupertUser,
        authUser: rupertUser ? {
          id: rupertUser.id,
          email: rupertUser.email,
          created_at: rupertUser.created_at,
          email_confirmed_at: rupertUser.email_confirmed_at
        } : null,
        totalAuthUsers: authUsers.users.length,
        allAuthEmails: authUsers.users.map(u => u.email)
      }
    });

  } catch (error) {
    console.error('Debug auth error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

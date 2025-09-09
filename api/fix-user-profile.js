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

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    console.log(`🔍 Fixing user profile for: ${email}`);

    // Get user from auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
      return res.status(500).json({ error: 'Failed to fetch auth users' });
    }
    
    const user = authUsers.users.find(u => u.email === email);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found in auth.users' });
    }
    
    console.log(`✅ Found user in auth.users: ${user.id}`);

    // Check if user profile exists
    const { data: existingProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error checking user profile:', profileError);
      return res.status(500).json({ error: 'Failed to check user profile' });
    }
    
    if (existingProfile) {
      console.log('✅ User profile already exists');
      return res.status(200).json({ 
        success: true, 
        message: 'User profile already exists',
        profile: existingProfile
      });
    }
    
    console.log('❌ User profile not found, creating...');
    
    // Create user profile
    const { data: newProfile, error: createError } = await supabase
      .from('user_profiles')
      .insert({
        id: user.id,
        email: user.email,
        first_name: user.user_metadata?.first_name || 'Rupert',
        last_name: user.user_metadata?.last_name || 'Weiner',
        is_active: true,
        is_admin: email === 'rupertweiner@gmail.com', // Make rupert an admin
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating user profile:', createError);
      return res.status(500).json({ error: 'Failed to create user profile', details: createError.message });
    }
    
    console.log('✅ User profile created successfully');
    
    res.status(200).json({
      success: true,
      message: 'User profile created successfully',
      profile: newProfile
    });

  } catch (error) {
    console.error('Fix user profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

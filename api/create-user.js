import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    console.log(`🔍 Creating user: ${email}`);

    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError);
      return res.status(500).json({ error: 'Failed to check existing users', details: listError.message });
    }

    const existingUser = existingUsers.users.find(user => user.email === email);
    
    if (existingUser) {
      console.log('✅ User already exists in auth.users:', existingUser.id);
      
      // Check if profile exists
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', existingUser.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.log('❌ Profile not found, creating...');
        
        // Create user profile
        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            id: existingUser.id,
            email: existingUser.email,
            first_name: existingUser.user_metadata?.first_name || 'Rupert',
            last_name: existingUser.user_metadata?.last_name || 'Weiner',
            is_active: true,
            is_admin: email === 'rupertweiner@gmail.com',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ Error creating profile:', createError);
          return res.status(500).json({ error: 'Failed to create user profile', details: createError.message });
        } else {
          console.log('✅ Profile created:', newProfile);
          return res.status(200).json({ 
            success: true, 
            message: 'User profile created successfully',
            user: newProfile
          });
        }
      } else {
        console.log('✅ Profile already exists:', profile);
        return res.status(200).json({ 
          success: true, 
          message: 'User and profile already exist',
          user: profile
        });
      }
    }

    // Create new user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        first_name: email === 'rupertweiner@gmail.com' ? 'Rupert' : 'User',
        last_name: email === 'rupertweiner@gmail.com' ? 'Weiner' : 'Name'
      }
    });

    if (createError) {
      console.error('❌ Error creating user:', createError);
      return res.status(500).json({ error: 'Failed to create user', details: createError.message });
    }

    console.log('✅ User created in auth.users:', newUser.user.id);

    // Create user profile
    const { data: newProfile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: newUser.user.id,
        email: newUser.user.email,
        first_name: newUser.user.user_metadata?.first_name || 'User',
        last_name: newUser.user.user_metadata?.last_name || 'Name',
        is_active: true,
        is_admin: email === 'rupertweiner@gmail.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Error creating profile:', profileError);
      return res.status(500).json({ error: 'Failed to create user profile', details: profileError.message });
    }

    console.log('✅ Profile created:', newProfile);

    res.status(200).json({
      success: true,
      message: 'User and profile created successfully',
      user: newProfile
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
}

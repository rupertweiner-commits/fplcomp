import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixUserProfile() {
  try {
    console.log('🔍 Checking for user profile...');
    
    // First, let's check if the user exists in auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
      return;
    }
    
    const rupertUser = authUsers.users.find(user => user.email === 'rupertweiner@gmail.com');
    
    if (!rupertUser) {
      console.log('❌ User not found in auth.users');
      return;
    }
    
    console.log('✅ Found user in auth.users:', rupertUser.id, rupertUser.email);
    
    // Check if user exists in user_profiles
    const { data: existingProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', rupertUser.id)
      .single();
    
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error checking user profile:', profileError);
      return;
    }
    
    if (existingProfile) {
      console.log('✅ User profile already exists:', existingProfile);
      return;
    }
    
    console.log('❌ User profile not found, creating...');
    
    // Create user profile
    const { data: newProfile, error: createError } = await supabase
      .from('user_profiles')
      .insert({
        id: rupertUser.id,
        email: rupertUser.email,
        first_name: 'Rupert',
        last_name: 'Weiner',
        is_active: true,
        is_admin: true, // Make this user an admin
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating user profile:', createError);
      return;
    }
    
    console.log('✅ User profile created successfully:', newProfile);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

fixUserProfile();

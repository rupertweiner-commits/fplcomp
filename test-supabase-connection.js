import { createClient } from '@supabase/supabase-js';

// Test Supabase connection and user authentication
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

console.log('🔍 Testing Supabase connection...');
console.log('URL:', supabaseUrl);
console.log('Key (first 20 chars):', supabaseKey.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Test 1: Check if we can connect to Supabase
    console.log('\n1. Testing Supabase connection...');
    const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
    
    if (error) {
      console.error('❌ Supabase connection failed:', error);
      return;
    }
    
    console.log('✅ Supabase connection successful');
    
    // Test 2: Check if user exists in auth.users (we can't directly query this)
    console.log('\n2. Testing user authentication...');
    
    // Test 3: Check user_profiles table
    console.log('\n3. Checking user_profiles table...');
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', 'rupertweiner@gmail.com');
    
    if (profilesError) {
      console.error('❌ Error querying user_profiles:', profilesError);
    } else {
      console.log('✅ User profiles query successful');
      console.log('Found profiles:', profiles.length);
      if (profiles.length > 0) {
        console.log('Profile data:', profiles[0]);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testConnection();
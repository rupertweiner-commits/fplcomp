// Test Supabase connection
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lhkurlcdrzuncibcehfp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxoa3VybGNkcnp1bmNpYmNlaGZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MzM5ODksImV4cCI6MjA3MTIwOTk4OX0.MM3MrX3x4zXTAYVSew5gcMSADhm33Ly2f_mhACDSJpE'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  console.log('🧪 Testing Supabase connection...')
  
  try {
    // Test 1: Check if we can connect
    const { data, error } = await supabase.from('users').select('count').limit(1)
    
    if (error) {
      console.error('❌ Connection failed:', error.message)
      return false
    }
    
    console.log('✅ Supabase connection successful!')
    console.log('📊 Users table accessible')
    
    // Test 2: Try to sign up a test user
    const testEmail = `test-${Date.now()}@example.com`
    const testPassword = 'testpassword123'
    
    console.log('🧪 Testing user signup...')
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword
    })
    
    if (authError) {
      console.error('❌ Signup test failed:', authError.message)
      return false
    }
    
    console.log('✅ User signup test successful!')
    console.log('👤 Test user created:', authData.user?.email)
    
    return true
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
    return false
  }
}

testConnection().then(success => {
  if (success) {
    console.log('🎉 All tests passed! Supabase is working correctly.')
  } else {
    console.log('💥 Tests failed. Check your Supabase configuration.')
  }
})

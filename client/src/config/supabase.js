import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Debug logging
console.log('🔍 Supabase Config Debug:')
console.log('  REACT_APP_SUPABASE_URL:', process.env.REACT_APP_SUPABASE_URL)
console.log('  NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('  Final URL:', supabaseUrl)
console.log('  Final Key:', supabaseAnonKey.substring(0, 20) + '...')

if (!process.env.REACT_APP_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.warn('⚠️ Missing Supabase environment variables. Using placeholder values.')
} else {
  console.log('✅ Supabase environment variables found!')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Helper functions for common operations
export const supabaseHelpers = {
  // Get user profile
  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (error) throw error
    return data
  },

  // Update user profile
  async updateUserProfile(userId, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get draft status
  async getDraftStatus() {
    const { data, error } = await supabase
      .from('draft_data')
      .select('*')
      .order('id', { ascending: false })
      .limit(1)
      .single()
    
    if (error) throw error
    return data
  },

  // Subscribe to real-time updates
  subscribeToDraftUpdates(callback) {
    return supabase
      .channel('draft_updates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'draft_data' },
        callback
      )
      .subscribe()
  },

  // Subscribe to user activity
  subscribeToUserActivity(userId, callback) {
    return supabase
      .channel(`user_activity_${userId}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'user_activity', filter: `user_id=eq.${userId}` },
        callback
      )
      .subscribe()
  }
}

export default supabase

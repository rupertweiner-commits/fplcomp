import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { username, password } = await req.json()

    // Validate required fields
    if (!username || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Username and password are required'
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Check if user exists
    const { data: user, error } = await supabaseClient
      .from('users')
      .select('*')
      .eq('username', username)
      .single()

    if (error || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid username or password'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user is active
    if (!user.is_active) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Account is deactivated'
        }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // For demo purposes, accept any password for existing users
    // In production, you would verify the password hash here
    if (!user.password_hash) {
      // Set default password for demo users
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              firstName: user.first_name,
              lastName: user.last_name,
              isAdmin: user.is_admin,
              profilePicture: user.profile_picture,
              notificationPreferences: user.notification_preferences
            },
            token: 'demo-token-' + user.id
          }
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Return user data
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            isAdmin: user.is_admin,
            profilePicture: user.profile_picture,
            notificationPreferences: user.notification_preferences
          },
          token: 'demo-token-' + user.id
        },
        message: 'Login successful'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Login error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
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
    const { username, email } = await req.json()

    if (!username || !email) {
      return new Response(
        JSON.stringify({ error: 'Username and email are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // For now, we'll create a simple authentication system
    // In production, you'd want to use Supabase Auth
    const { data: profile, error } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .eq('username', username)
      .eq('email', email)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    if (!profile) {
      // Create new user profile
      const { data: newProfile, error: createError } = await supabaseClient
        .from('user_profiles')
        .insert([
          { 
            username, 
            email,
            id: crypto.randomUUID() // Generate a temporary ID
          }
        ])
        .select()
        .single()

      if (createError) {
        throw createError
      }

      // Create user team
      await supabaseClient
        .from('user_teams')
        .insert([
          { 
            user_id: newProfile.id,
            team_name: `${username}'s Team`
          }
        ])

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: { 
            user: newProfile,
            message: 'User created successfully' 
          } 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Return existing user
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { 
          user: profile,
          message: 'Login successful' 
        } 
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
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

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
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get draft status with users
    const { data: draftStatus, error } = await supabaseClient
      .rpc('get_draft_status')

    if (error) {
      throw error
    }

    if (!draftStatus || draftStatus.length === 0) {
      // Create initial draft status if none exists
      const { data: newStatus, error: createError } = await supabaseClient
        .from('draft_status')
        .insert([
          { 
            status: 'waiting',
            current_round: 1,
            time_per_turn: 60,
            is_simulation_mode: false,
            active_gameweek: 1,
            current_gameweek: 1
          }
        ])
        .select()
        .single()

      if (createError) {
        throw createError
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          data: { 
            ...newStatus,
            users: []
          } 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: draftStatus[0] 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Draft status error:', error)
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

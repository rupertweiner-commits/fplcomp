import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    // For now, return mock Chelsea players data to test connectivity
    const mockPlayers = [
      {
        id: 1,
        web_name: "Cole Palmer",
        first_name: "Cole",
        second_name: "Palmer",
        position_short: "MID",
        now_cost: 60,
        total_points: 205,
        form: 7.2
      },
      {
        id: 2,
        web_name: "Nicolas Jackson",
        first_name: "Nicolas",
        second_name: "Jackson",
        position_short: "FWD",
        now_cost: 70,
        total_points: 180,
        form: 6.8
      }
    ];

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: mockPlayers 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Chelsea players error:', error)
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

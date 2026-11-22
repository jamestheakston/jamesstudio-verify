import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

// Simple in-memory session storage (for production, use Supabase database)
const sessions = new Map()

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const sessionId = url.searchParams.get('session')

  if (req.method === 'POST') {
    // Update session status
    const { status } = await req.json()
    
    if (sessionId) {
      sessions.set(sessionId, {
        status: status,
        updatedAt: new Date().toISOString()
      })
      
      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    return new Response(
      JSON.stringify({ error: 'Session ID required' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  if (req.method === 'GET') {
    // Get session status
    if (sessionId) {
      const session = sessions.get(sessionId)
      
      if (session) {
        return new Response(
          JSON.stringify(session),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      return new Response(
        JSON.stringify({ status: 'pending' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }
    
    return new Response(
      JSON.stringify({ error: 'Session ID required' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  return new Response('Method not allowed', { status: 405, headers: corsHeaders })
})

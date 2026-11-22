import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const sessionId = url.searchParams.get('session')

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !supabaseAnonKey) {
    return new Response(
      JSON.stringify({ error: 'Supabase credentials not set' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  if (req.method === 'POST') {
    // Update session status
    const { status } = await req.json()
    
    if (sessionId) {
      // Insert or update session in database
      const { error } = await supabase
        .from('verification_sessions')
        .upsert({ session_id: sessionId, status: status, updated_at: new Date().toISOString() })
        .select()
      
      if (error) {
        // If table doesn't exist, create it
        if (error.code === '42P01') {
          const { error: createError } = await supabase.rpc('create_verification_sessions_table')
          if (createError) {
            console.error('Error creating table:', createError)
            return new Response(
              JSON.stringify({ error: 'Failed to create table' }),
              {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }
          // Retry the upsert after table creation
          const { error: retryError } = await supabase
            .from('verification_sessions')
            .upsert({ session_id: sessionId, status: status, updated_at: new Date().toISOString() })
          if (retryError) {
            return new Response(
              JSON.stringify({ error: retryError.message }),
              {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            )
          }
        } else {
          return new Response(
            JSON.stringify({ error: error.message }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
      }
      
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
      const { data, error } = await supabase
        .from('verification_sessions')
        .select('status', 'updated_at')
        .eq('session_id', sessionId)
        .single()
      
      if (error) {
        // If table doesn't exist, return pending
        if (error.code === '42P01') {
          return new Response(
            JSON.stringify({ status: 'pending' }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      if (data) {
        return new Response(
          JSON.stringify(data),
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

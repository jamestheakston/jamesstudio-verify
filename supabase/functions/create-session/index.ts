import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const truelayerClientId = Deno.env.get('TRUELAYER_CLIENT_ID')
    const truelayerClientSecret = Deno.env.get('TRUELAYER_CLIENT_SECRET')

    if (!truelayerClientId || !truelayerClientSecret) {
      throw new Error('TrueLayer credentials not set')
    }

    const { redirectUri } = await req.json()

    // Generate TrueLayer OAuth URL
    const authUrl = new URL('https://auth.truelayer.com')
    authUrl.pathname = '/'

    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('client_id', truelayerClientId)
    authUrl.searchParams.set('nonce', Math.random().toString(36).substring(7))
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', 'accounts info balance transactions')
    authUrl.searchParams.set('enable_mock', 'false')

    return new Response(
      JSON.stringify({
        authUrl: authUrl.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error creating session:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

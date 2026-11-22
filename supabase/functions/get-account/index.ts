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

    const { code, redirectUri } = await req.json()

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.truelayer.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: truelayerClientId,
        client_secret: truelayerClientSecret,
        redirect_uri: redirectUri,
        code: code
      })
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      throw new Error(`Token exchange failed: ${error}`)
    }

    const tokenData = await tokenResponse.json()

    // Get account info using the access token
    const accountsResponse = await fetch('https://api.truelayer.com/data/v1/accounts', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    })

    if (!accountsResponse.ok) {
      throw new Error('Failed to fetch accounts')
    }

    const accountsData = await accountsResponse.json()

    // Get account details for the first account
    if (accountsData.results && accountsData.results.length > 0) {
      const account = accountsData.results[0]

      return new Response(
        JSON.stringify({
          account: {
            id: account.account_id,
            displayName: account.display_name,
            institutionName: account.provider.display_name,
            last4: account.account_number.nat.substring(account.account_number.nat.length - 4),
            currency: account.currency,
            type: account.account_type
          },
          owner: {
            name: account.account_holder_name
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    throw new Error('No accounts found')
  } catch (error) {
    console.error('Error retrieving account:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

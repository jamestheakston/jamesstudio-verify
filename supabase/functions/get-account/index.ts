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

    console.log('Client ID:', truelayerClientId)

    if (!truelayerClientId || !truelayerClientSecret) {
      throw new Error('TrueLayer credentials not set')
    }

    const { code, redirectUri } = await req.json()
    console.log('Redirect URI:', redirectUri)
    console.log('Auth code length:', code?.length)

    // Exchange authorization code for access token
    console.log('Attempting token exchange...')
    
    // Use live endpoint
    const tokenUrl = 'https://auth.truelayer.com/connect/token'
    console.log('Using token endpoint:', tokenUrl)
    
    const tokenResponse = await fetch(tokenUrl, {
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

    console.log('Token response status:', tokenResponse.status)

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.log('Token exchange error:', error)
      throw new Error(`Token exchange failed: ${error}`)
    }

    const tokenData = await tokenResponse.json()
    console.log('Token received, access_token length:', tokenData.access_token?.length)

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
      
      // Safely get last 4 digits of account number
      const last4 = account.account_number?.nat 
        ? account.account_number.nat.substring(account.account_number.nat.length - 4)
        : '****'

      // Bank logo from TrueLayer's provider info (force https, null if missing)
      const rawLogo: string | undefined = account.provider?.logo_uri
      const logoUrl = rawLogo ? rawLogo.replace(/^http:\/\//, 'https://') : null

      return new Response(
        JSON.stringify({
          account: {
            id: account.account_id,
            displayName: account.display_name,
            institutionName: account.provider?.display_name || 'Unknown',
            logoUrl: logoUrl,
            last4: last4,
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
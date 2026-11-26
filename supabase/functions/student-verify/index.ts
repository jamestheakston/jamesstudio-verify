import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  try {
    if (action === 'create') {
      // Create a new verification request
      const { redirectUrl } = await req.json()

      // Generate a secret token
      const secretToken = crypto.randomUUID()

      // Call Studid API to create verification
      const studidResponse = await fetch('https://api.studid.io/v2/auth/verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secretToken: secretToken,
          redirectUrl: redirectUrl || 'https://verify.jamesstudio.uk/',
          serviceName: 'James Studio'
        })
      })

      if (!studidResponse.ok) {
        const errorText = await studidResponse.text()
        console.error('Studid error:', errorText)
        return new Response(
          JSON.stringify({ error: 'Failed to create verification', details: errorText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const studidData = await studidResponse.json()
      console.log('Studid verification created:', studidData.id)

      return new Response(
        JSON.stringify({
          success: true,
          id: studidData.id,
          link: studidData.link,
          secretToken: secretToken
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else if (action === 'check') {
      // Check verification result
      const { id, secretToken } = await req.json()

      if (!id || !secretToken) {
        return new Response(
          JSON.stringify({ error: 'Missing id or secretToken' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Call Studid API to check verification
      const studidResponse = await fetch(
        `https://api.studid.io/v2/auth/verification/${id}?id=${id}&secretToken=${secretToken}`
      )

      if (!studidResponse.ok) {
        const errorText = await studidResponse.text()
        console.error('Studid check error:', errorText)
        return new Response(
          JSON.stringify({ error: 'Failed to check verification', details: errorText }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const studidData = await studidResponse.json()
      console.log('Studid verification result:', studidData)

      return new Response(
        JSON.stringify({
          success: true,
          data: studidData
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid action. Use ?action=create or ?action=check' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

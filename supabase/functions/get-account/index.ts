import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Stripe } from "https://esm.sh/stripe@14.21.0"

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
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }

    const stripe = new Stripe(stripeSecretKey)

    const { sessionId } = await req.json()

    // Retrieve the completed session
    const session = await stripe.financialConnections.sessions.retrieve(sessionId)

    if (session.status !== 'succeeded') {
      throw new Error('Session not completed')
    }

    // Get the first linked account
    const accountId = session.accounts.data[0].id

    // Retrieve account with ownership details
    const account = await stripe.financialConnections.accounts.retrieve(accountId, {
      expand: ['ownership']
    })

    // Extract ownership information
    const ownershipData = account.ownership?.data.map(owner => ({
      name: owner.name,
      address: owner.address,
      email: owner.email
    })) || []

    return new Response(
      JSON.stringify({
        account: {
          id: account.id,
          displayName: account.display_name,
          institutionName: account.institution_name,
          last4: account.last4,
          category: account.category,
          subcategory: account.subcategory,
          status: account.status
        },
        ownership: ownershipData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
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

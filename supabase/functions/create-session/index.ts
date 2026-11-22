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
    // Optional: Check for authorization header but don't fail if missing
    const authHeader = req.headers.get('authorization')
    console.log('Auth header:', authHeader ? 'Present' : 'Missing')

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set')
    }

    const stripe = new Stripe(stripeSecretKey)

    const { customerEmail } = await req.json()

    // Create a customer if email is provided (for return user optimization)
    let customerId = null
    if (customerEmail) {
      const customer = await stripe.customers.create({
        email: customerEmail
      })
      customerId = customer.id
    }

    // Create Financial Connections Session
    const session = await stripe.financialConnections.sessions.create({
      account_holder: {
        type: 'customer',
        customer: customerId
      },
      permissions: ['payment_method', 'ownership'], // For account ownership verification
    })

    return new Response(
      JSON.stringify({
        clientSecret: session.client_secret,
        sessionId: session.id
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

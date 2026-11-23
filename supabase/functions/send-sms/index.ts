import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ClickSend credentials
const CLICKSEND_USERNAME = Deno.env.get('CLICKSEND_USERNAME')
const CLICKSEND_API_KEY = Deno.env.get('CLICKSEND_API_KEY')

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { phoneNumber } = await req.json()

    if (!phoneNumber) {
      return new Response(
        JSON.stringify({ error: 'Phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate phone number format (basic check)
    if (!phoneNumber.match(/^\+?[\d\s-()]+$/)) {
      return new Response(
        JSON.stringify({ error: 'Invalid phone number format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString()

    // Store code in Supabase database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Normalize phone number for storage
    const normalizedPhone = phoneNumber.replace(/[\s-()]/g, '')

    // Store or update verification code with 5-minute expiry
    const { error: dbError } = await supabase
      .from('sms_verifications')
      .upsert({
        phone_number: normalizedPhone,
        code: code,
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        attempts: 0
      }, {
        onConflict: 'phone_number'
      })

    if (dbError) {
      console.error('Database error:', dbError)
      return new Response(
        JSON.stringify({ error: 'Failed to store verification code' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Send SMS via ClickSend
    const clicksendUrl = 'https://rest.clicksend.com/v3/sms/send'
    const credentials = btoa(`${CLICKSEND_USERNAME}:${CLICKSEND_API_KEY}`)

    const clicksendResponse = await fetch(clicksendUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            body: `Your James Studio verification code is: ${code}. Valid for 5 minutes.`,
            to: normalizedPhone,
            source: 'James Studio'
          }
        ]
      })
    })

    if (!clicksendResponse.ok) {
      const errorText = await clicksendResponse.text()
      console.error('ClickSend error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to send SMS', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const clicksendData = await clicksendResponse.json()
    console.log('SMS sent successfully:', clicksendData.response_code)

    return new Response(
      JSON.stringify({ success: true, messageId: clicksendData.data?.messages?.[0]?.message_id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

# Supabase Edge Functions Setup

This project uses Supabase Edge Functions to handle Stripe Financial Connections API calls.

## Prerequisites

- Supabase CLI installed
- Supabase project created

## Setup Instructions

### 1. Link your Supabase project

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### 2. Set the Stripe Secret Key as an Edge Function secret

Run this command to set your Stripe secret key:

```bash
supabase secrets set STRIPE_SECRET_KEY=your_stripe_secret_key_here
```

### 3. Deploy the Edge Functions

Deploy both functions to your Supabase project:

```bash
supabase functions deploy create-session
supabase functions deploy get-account
```

### 4. Update the frontend URLs

In `index.html`, update the Edge Function URLs to match your Supabase project:

```javascript
const CREATE_SESSION_URL = 'https://pkqkqijmohbvfxxnzhyy.supabase.co/functions/v1/create-session';
const GET_ACCOUNT_URL = 'https://pkqkqijmohbvfxxnzhyy.supabase.co/functions/v1/get-account';
```

## How it works

1. **create-session**: Creates a Stripe Financial Connections Session with the required permissions (`payment_method` and `ownership`) for account ownership verification.

2. **get-account**: Retrieves the completed session and fetches the account details including ownership information.

## Security Notes

- The Stripe Secret Key is stored as a Supabase Edge Function secret and is never exposed to the client
- The Stripe Publishable Key is safe to use in the frontend
- All API calls are made server-side through the Edge Functions

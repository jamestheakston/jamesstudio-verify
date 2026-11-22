# Supabase Edge Functions Setup

This project uses Supabase Edge Functions to handle TrueLayer Open Banking API calls for UK bank account verification.

## Prerequisites

- Supabase CLI installed
- Supabase project created
- TrueLayer account with Client ID and Client Secret

## Setup Instructions

### 1. Link your Supabase project

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### 2. Set the TrueLayer credentials as Edge Function secrets

Run these commands to set your TrueLayer credentials:

```bash
supabase secrets set TRUELAYER_CLIENT_ID=jamesstudioverify-6d8520
supabase secrets set TRUELAYER_CLIENT_SECRET=tlcs_live_bl32fp54vdtb_h4QyJ4aHksOPp6xtEc99y0IDhzsPhfq9u7Jh7y1951tj
```

### 3. Add redirect URI to TrueLayer

In your TrueLayer dashboard, add this redirect URI:
```
https://verify.jamesstudio.uk/
```

### 4. Deploy the Edge Functions

Deploy both functions to your Supabase project:

```bash
supabase functions deploy create-session
supabase functions deploy get-account
```

## How it works

1. **create-session**: Generates a TrueLayer OAuth authorization URL for the user to connect their UK bank account.

2. **get-account**: Exchanges the OAuth code for an access token and retrieves account ownership details.

## Security Notes

- The TrueLayer Client Secret is stored as a Supabase Edge Function secret and is never exposed to the client
- The TrueLayer Client ID is safe to use in the frontend
- All API calls are made server-side through the Edge Functions

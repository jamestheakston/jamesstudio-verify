// Initialize Stripe with your publishable key
const stripe = Stripe('pk_live_51Tq7EiQRqfK4ur9ZYyoOe8n9AbbBThgho04cmlfyV1JfpnunCsVHebJ7NZkM8F3SyHnzjmzagBLl1p6KxfrjHk0b00ZIuOwmuv');

// Supabase Edge Function URLs
const CREATE_SESSION_URL = 'https://pkqkqijmohbvfxxnzhyy.supabase.co/functions/v1/create-session';
const GET_ACCOUNT_URL = 'https://pkqkqijmohbvfxxnzhyy.supabase.co/functions/v1/get-account';
const SUPABASE_ANON_KEY = 'sb_publishable_Raqakv5Z4U8Wr7zmzIvLDA_TsnBSFyS';

let currentSessionId = null;

// Bank card click handler
document.getElementById('bankCard').addEventListener('click', async () => {
    try {
        // Show loading state
        document.getElementById('header').style.display = 'none';
        document.getElementById('cards').style.display = 'none';
        document.getElementById('loading').classList.add('active');

        // Create Financial Connections Session
        const response = await fetch(CREATE_SESSION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                customerEmail: null
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create session');
        }

        const { clientSecret, sessionId } = await response.json();
        currentSessionId = sessionId;

        // Launch Stripe Financial Connections flow
        const result = await stripe.collectFinancialConnectionsAccounts({
            clientSecret: clientSecret,
        });

        if (result.error) {
            throw new Error(result.error.message);
        }

        // Get account details
        const accountResponse = await fetch(GET_ACCOUNT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                sessionId: currentSessionId
            })
        });

        if (!accountResponse.ok) {
            throw new Error('Failed to retrieve account details');
        }

        const { account, ownership } = await accountResponse.json();

        // Show success state
        document.getElementById('loading').classList.remove('active');
        document.getElementById('success').classList.add('active');

        // Display account details
        const accountDetails = document.getElementById('accountDetails');
        let html = `
            <p><strong>Bank:</strong> ${account.institutionName}</p>
            <p><strong>Account:</strong> ${account.displayName} (...${account.last4})</p>
            <p><strong>Type:</strong> ${account.category} - ${account.subcategory}</p>
        `;

        if (ownership.length > 0) {
            html += `
                <p style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e5e5;">
                    <strong>Account Owner:</strong> ${ownership[0].name}
                </p>
            `;
        }

        accountDetails.innerHTML = html;

    } catch (error) {
        console.error('Error:', error);
        alert('Verification failed: ' + error.message);

        // Reset to initial state
        document.getElementById('loading').classList.remove('active');
        document.getElementById('header').style.display = 'block';
        document.getElementById('cards').style.display = 'flex';
    }
});

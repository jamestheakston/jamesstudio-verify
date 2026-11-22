// Supabase Edge Function URLs
const CREATE_SESSION_URL = 'https://pkqkqijmohbvfxxnzhyy.supabase.co/functions/v1/create-session';
const GET_ACCOUNT_URL = 'https://pkqkqijmohbvfxxnzhyy.supabase.co/functions/v1/get-account';
const SUPABASE_ANON_KEY = 'sb_publishable_Raqakv5Z4U8Wr7zmzIvLDA_TsnBSFyS';

// Get the current page URL for redirect
const redirectUri = window.location.origin + window.location.pathname;

// Check if we're returning from TrueLayer OAuth
const urlParams = new URLSearchParams(window.location.search);
const authCode = urlParams.get('code');
const error = urlParams.get('error');

if (error) {
    // Handle OAuth error
    handleOAuthError(error);
} else if (authCode) {
    // Handle OAuth callback
    handleOAuthCallback(authCode);
}

// Bank card click handler
document.getElementById('bankCard').addEventListener('click', async () => {
    try {
        // Show loading state
        document.getElementById('header').style.display = 'none';
        document.getElementById('cards').style.display = 'none';
        document.getElementById('loading').classList.add('active');

        // Create TrueLayer session
        const response = await fetch(CREATE_SESSION_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                redirectUri: redirectUri
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create session');
        }

        const { authUrl } = await response.json();

        // Redirect to TrueLayer OAuth
        window.location.href = authUrl;

    } catch (error) {
        console.error('Error:', error);
        alert('Verification failed: ' + error.message);

        // Reset to initial state
        document.getElementById('loading').classList.remove('active');
        document.getElementById('header').style.display = 'block';
        document.getElementById('cards').style.display = 'flex';
    }
});

async function handleOAuthCallback(code) {
    try {
        // Show loading state
        document.getElementById('header').style.display = 'none';
        document.getElementById('cards').style.display = 'none';
        document.getElementById('loading').classList.add('active');

        // Get account details
        const accountResponse = await fetch(GET_ACCOUNT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
                code: code,
                redirectUri: redirectUri
            })
        });

        if (!accountResponse.ok) {
            throw new Error('Failed to retrieve account details');
        }

        const { account, owner } = await accountResponse.json();

        // Show success state
        document.getElementById('loading').classList.remove('active');
        document.getElementById('success').classList.add('active');

        // Display account details
        const accountDetails = document.getElementById('accountDetails');
        let html = `
            <p><strong>Bank:</strong> ${account.institutionName}</p>
            <p><strong>Account:</strong> ${account.displayName} (...${account.last4})</p>
            <p><strong>Type:</strong> ${account.type}</p>
        `;

        if (owner && owner.name) {
            html += `
                <p style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e5e5;">
                    <strong>Account Owner:</strong> ${owner.name}
                </p>
            `;
        }

        accountDetails.innerHTML = html;

        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);

    } catch (error) {
        console.error('Error:', error);
        alert('Verification failed: ' + error.message);

        // Reset to initial state
        document.getElementById('loading').classList.remove('active');
        document.getElementById('header').style.display = 'block';
        document.getElementById('cards').style.display = 'flex';
    }
}

function handleOAuthError(error) {
    console.error('OAuth error:', error);

    // Reset to initial state
    document.getElementById('loading').classList.remove('active');
    document.getElementById('header').style.display = 'block';
    document.getElementById('cards').style.display = 'flex';

    // Show appropriate error message
    if (error === 'access_denied') {
        alert('Verification cancelled. You denied access to your bank account.');
    } else {
        alert('Verification failed: ' + error);
    }

    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
}

// Supabase Edge Function URLs
const CREATE_SESSION_URL = 'https://pkqkqijmohbvfxxnzhyy.supabase.co/functions/v1/create-session';
const GET_ACCOUNT_URL = 'https://pkqkqijmohbvfxxnzhyy.supabase.co/functions/v1/get-account';
const SESSION_STATUS_URL = 'https://pkqkqijmohbvfxxnzhyy.supabase.co/functions/v1/session-status';
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

// Phone card click handler
document.getElementById('phoneCard').addEventListener('click', () => {
    // Check if on mobile or desktop
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

    if (isMobile) {
        // On mobile, redirect directly with from=mobile parameter
        const sessionId = generateSessionId();
        window.location.href = `https://verify.jamesstudio.uk/verify?session=${sessionId}&from=mobile`;
    } else {
        // On desktop/tablet, show QR code
        showQRCode();
    }
});

function generateSessionId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function showQRCode() {
    const sessionId = generateSessionId();
    const verifyUrl = `https://verify.jamesstudio.uk/verify?session=${sessionId}`;

    console.log('QR URL:', verifyUrl);

    // Update debug info
    document.getElementById('debugSessionId').textContent = sessionId;
    document.getElementById('debugStatus').textContent = 'Initializing...';

    // Hide other states
    document.getElementById('header').style.display = 'none';
    document.getElementById('cards').style.display = 'none';
    document.getElementById('qr').classList.add('active');

    // Generate QR code using qrcodejs
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = '';

    new QRCode(qrContainer, {
        text: verifyUrl,
        width: 200,
        height: 200,
        colorDark: '#1A1A1A',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });

    // Set the link href after QR is shown
    setTimeout(() => {
        const qrLink = document.getElementById('qrLink');
        if (qrLink) {
            qrLink.href = verifyUrl;
            console.log('Link href set to:', qrLink.href);
            
            qrLink.onclick = (e) => {
                e.preventDefault();
                console.log('Link clicked, navigating to:', verifyUrl);
                window.location.href = verifyUrl;
            };
        } else {
            console.error('qrLink element not found');
        }
    }, 100);

    // Initialize session status
    initializeSession(sessionId);

    // Poll for verification completion
    pollForCompletion(sessionId);
}

async function initializeSession(sessionId) {
    try {
        // Show loading overlay
        document.getElementById('qrLoadingOverlay').style.display = 'flex';
        document.getElementById('debugStatus').textContent = 'Creating session...';
        
        const response = await fetch(SESSION_STATUS_URL + `?session=${sessionId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ status: 'pending' })
        });
        
        // Hide loading overlay
        document.getElementById('qrLoadingOverlay').style.display = 'none';
        
        if (!response.ok) {
            const error = await response.text();
            console.error('Session init failed:', response.status, error);
            document.getElementById('debugStatus').textContent = 'Failed: ' + response.status;
        } else {
            console.log('Session initialized successfully');
            document.getElementById('debugStatus').textContent = 'Polling...';
        }
    } catch (error) {
        console.error('Error initializing session:', error);
        document.getElementById('qrLoadingOverlay').style.display = 'none';
        document.getElementById('debugStatus').textContent = 'Error: ' + error.message;
    }
}

async function pollForCompletion(sessionId) {
    console.log('Starting to poll for session:', sessionId);
    
    const pollInterval = setInterval(async () => {
        try {
            document.getElementById('debugStatus').textContent = 'Checking...';
            
            const response = await fetch(SESSION_STATUS_URL + `?session=${sessionId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                }
            });

            console.log('Poll response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('Session status:', data);
                document.getElementById('debugStatus').textContent = 'Status: ' + data.status;
                
                if (data.status === 'completed') {
                    clearInterval(pollInterval);
                    showCompletionSuccess();
                }
            } else {
                console.error('Poll request failed:', response.status);
                document.getElementById('debugStatus').textContent = 'Failed: ' + response.status;
            }
        } catch (error) {
            console.error('Error polling session status:', error);
            document.getElementById('debugStatus').textContent = 'Error: ' + error.message;
        }
    }, 3000); // Poll every 3 seconds
}

function showCompletionSuccess() {
    // Get the session ID from debug info
    const sessionId = document.getElementById('debugSessionId').textContent;
    
    // Delete the session from database
    deleteSession(sessionId);
    
    document.getElementById('qr').classList.remove('active');
    document.getElementById('header').style.display = 'block';
    document.getElementById('cards').style.display = 'flex';
    
    // Show success UI
    document.getElementById('header').innerHTML = '<h1>Identity Complete</h1><p>Your identity has been verified successfully.</p>';
    document.getElementById('cards').style.display = 'none';
}

async function deleteSession(sessionId) {
    try {
        await fetch(SESSION_STATUS_URL + `?session=${sessionId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        console.log('Session deleted:', sessionId);
    } catch (error) {
        console.error('Error deleting session:', error);
    }
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
    document.getElementById('header').style.display = 'none';
    document.getElementById('cards').style.display = 'none';

    // Show error state
    document.getElementById('error').classList.add('active');

    // Set error messages
    const errorTitle = document.getElementById('errorTitle');
    const errorMessage = document.getElementById('errorMessage');
    const errorInfo = document.getElementById('errorInfo');

    if (error === 'access_denied') {
        errorTitle.textContent = 'Verification Cancelled';
        errorMessage.textContent = 'You denied access to your bank account.';
        errorInfo.innerHTML = `
            <p><strong>What happened:</strong> You chose not to share your bank account information.</p>
            <p><strong>What to do:</strong> If you want to verify your identity, click "Try Again" to restart the process. You'll need to grant access to proceed.</p>
        `;
    } else {
        errorTitle.textContent = 'Verification Failed';
        errorMessage.textContent = 'Something went wrong during the verification process.';
        errorInfo.innerHTML = `
            <p><strong>Error:</strong> ${error}</p>
            <p><strong>What to do:</strong> Click "Try Again" to restart the verification process. If the problem persists, please contact support.</p>
        `;
    }

    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
}

// Retry button handler
document.getElementById('retryBtn').addEventListener('click', () => {
    document.getElementById('error').classList.remove('active');
    document.getElementById('header').style.display = 'block';
    document.getElementById('cards').style.display = 'flex';
});

// QR back button handler
document.getElementById('qrBackBtn').addEventListener('click', () => {
    document.getElementById('qr').classList.remove('active');
    document.getElementById('header').style.display = 'block';
    document.getElementById('cards').style.display = 'flex';
});

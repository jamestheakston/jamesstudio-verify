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

// Check if user is on mobile
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;

// Disable phone verification on mobile
if (isMobile) {
    const phoneCard = document.getElementById('phoneCard');
    phoneCard.classList.add('desktop-only');
    phoneCard.classList.remove('active');
    document.getElementById('phoneMessage').style.display = 'block';
}

// Phone card click handler
document.getElementById('phoneCard').addEventListener('click', () => {
    // Only allow on desktop
    if (isMobile) {
        return; // Do nothing on mobile
    }
    
    // On desktop/tablet, show QR code
    showQRCode();
});

function generateSessionId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function showQRCode() {
    const sessionId = generateSessionId();
    const verifyUrl = `https://verify.jamesstudio.uk/verify?session=${sessionId}`;

    console.log('QR URL:', verifyUrl);

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
        } else {
            console.log('Session initialized successfully');
        }
    } catch (error) {
        console.error('Error initializing session:', error);
        document.getElementById('qrLoadingOverlay').style.display = 'none';
    }
}

async function pollForCompletion(sessionId) {
    console.log('Starting to poll for session:', sessionId);
    
    const pollInterval = setInterval(async () => {
        try {
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
                
                if (data.status === 'completed') {
                    clearInterval(pollInterval);
                    showCompletionSuccess();
                }
            } else {
                console.error('Poll request failed:', response.status);
            }
        } catch (error) {
            console.error('Error polling session status:', error);
        }
    }, 3000); // Poll every 3 seconds
}

function showCompletionSuccess() {
    document.getElementById('qr').classList.remove('active');
    document.getElementById('header').style.display = 'block';
    document.getElementById('cards').style.display = 'flex';
    
    // Show success tick on phone card
    document.getElementById('phoneSuccessTick').style.display = 'flex';
    
    // Show success UI with large tick icon like verify.html
    document.getElementById('header').innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; padding: 40px 0;">
            <div style="width: 64px; height: 64px; background: #1A1A1A; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
                <svg width="32" height="32" fill="none" stroke="white" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
            </div>
            <h1 style="margin: 0;">Identity Verified</h1>
            <p style="color: #666;">Your identity has been verified successfully.</p>
        </div>
    `;
    document.getElementById('cards').style.display = 'none';
}

// Bank card click handler: show the consent screen first
document.getElementById('bankCard').addEventListener('click', () => {
    showConsent();
});

function showConsent() {
    document.getElementById('header').style.display = 'none';
    document.getElementById('cards').style.display = 'none';
    document.getElementById('consent').classList.add('active');
}

function hideConsent() {
    document.getElementById('consent').classList.remove('active');
    document.getElementById('header').style.display = 'block';
    document.getElementById('cards').style.display = 'flex';
}

// Consent: Cancel goes back to the method list
document.getElementById('consentCancelBtn').addEventListener('click', hideConsent);

// Consent: Continue starts the TrueLayer flow
document.getElementById('consentContinueBtn').addEventListener('click', () => {
    document.getElementById('consent').classList.remove('active');
    startBankVerification();
});

async function startBankVerification() {
    document.getElementById('loadingText').textContent = 'Connecting to your bank...';
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
}

async function handleOAuthCallback(code) {
    try {
        // Show loading state
        document.getElementById('header').style.display = 'none';
        document.getElementById('cards').style.display = 'none';
        document.getElementById('loading').classList.add('active');

        // Get account details
        console.log('Exchanging code for account details');
        console.log('Redirect URI:', redirectUri);
        console.log('Auth code:', code ? code.substring(0, 10) + '...' : 'No code');

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
        accountDetails.prepend(buildBankRow(account));

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

// Bank logo + name row. Uses account.logoUrl if the backend returns one,
// otherwise falls back to the bank's initial.
function buildBankRow(account) {
    const row = document.createElement('div');
    row.className = 'bank-row';

    const name = account.institutionName || 'Your bank';
    const logoUrl = account.logoUrl;

    function addInitial() {
        const tile = document.createElement('div');
        tile.className = 'bank-logo';
        tile.textContent = name.charAt(0).toUpperCase();
        row.prepend(tile);
    }

    if (typeof logoUrl === 'string' && logoUrl.startsWith('https://')) {
        const img = document.createElement('img');
        img.className = 'bank-logo';
        img.alt = '';
        img.src = logoUrl;
        img.onerror = () => {
            img.remove();
            addInitial();
        };
        row.appendChild(img);
    } else {
        addInitial();
    }

    const label = document.createElement('span');
    label.textContent = name;
    row.appendChild(label);
    return row;
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
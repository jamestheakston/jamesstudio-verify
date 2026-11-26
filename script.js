// Supabase Edge Function URLs
const CREATE_SESSION_URL = 'https://pkqkqijmohbvfxxnzhyy.supabase.co/functions/v1/create-session';
const GET_ACCOUNT_URL = 'https://pkqkqijmohbvfxxnzhyy.supabase.co/functions/v1/get-account';
const SESSION_STATUS_URL = 'https://pkqkqijmohbvfxxnzhyy.supabase.co/functions/v1/session-status';
const SEND_SMS_URL = 'https://pkqkqijmohbvfxxnzhyy.supabase.co/functions/v1/send-sms';
const VERIFY_SMS_URL = 'https://pkqkqijmohbvfxxnzhyy.supabase.co/functions/v1/verify-sms';
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
    return crypto.randomUUID();
}

function showQRCode() {
    const sessionId = generateSessionId();
    const verifyUrl = `https://verify.jamesstudio.uk/verify?session=${sessionId}`;

    console.log('QR URL:', verifyUrl);

    // Hide other states
    document.getElementById('header').style.display = 'none';
    document.getElementById('cards').style.display = 'none';
    document.getElementById('qr').classList.add('active');

    resetQRExpiry();

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

let qrPollInterval = null;
let qrPollTimeout = null;

function stopPolling() {
    clearInterval(qrPollInterval);
    clearTimeout(qrPollTimeout);
    qrPollInterval = null;
    qrPollTimeout = null;
}

async function pollForCompletion(sessionId) {
    console.log('Starting to poll for session:', sessionId);
    
    stopPolling();
    qrPollInterval = setInterval(async () => {
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
                    stopPolling();
                    showCompletionSuccess();
                }
            } else {
                console.error('Poll request failed:', response.status);
            }
        } catch (error) {
            console.error('Error polling session status:', error);
        }
    }, 3000); // Poll every 3 seconds

    // Expire the QR code after 5 minutes
    qrPollTimeout = setTimeout(expireQR, 5 * 60 * 1000);
}

function expireQR() {
    stopPolling();
    document.getElementById('qrExpiredOverlay').style.display = 'flex';
    document.getElementById('qrRefreshBtn').style.display = 'inline-block';
    document.querySelector('.qr-loading').textContent = 'This QR code has expired.';
}

function resetQRExpiry() {
    document.getElementById('qrExpiredOverlay').style.display = 'none';
    document.getElementById('qrRefreshBtn').style.display = 'none';
    document.querySelector('.qr-loading').textContent = 'Waiting for mobile verification...';
}

function showCompletionSuccess() {
    document.getElementById('qr').classList.remove('active');
    document.getElementById('header').style.display = 'block';
    document.getElementById('cards').style.display = 'grid';
    
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
    document.getElementById('cards').style.display = 'grid';
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
        document.getElementById('cards').style.display = 'grid';
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

        // Display account details (built with textContent, never innerHTML)
        const accountDetails = document.getElementById('accountDetails');
        accountDetails.innerHTML = '';
        accountDetails.appendChild(buildBankRow(account));

        const hasDigits = account.last4 && /^\d{4}$/.test(account.last4);
        const accountText = (account.displayName ? toTitleCase(account.displayName) : 'Account')
            + (hasDigits ? ` (...${account.last4})` : '');
        addDetail(accountDetails, 'Account', accountText);
        addDetail(accountDetails, 'Type', formatAccountType(account.type));
        if (owner && owner.name) {
            addDetail(accountDetails, 'Account Owner', toTitleCase(owner.name), true);
        }

        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);

    } catch (error) {
        console.error('Error:', error);
        alert('Verification failed: ' + error.message);

        // Reset to initial state
        document.getElementById('loading').classList.remove('active');
        document.getElementById('header').style.display = 'block';
        document.getElementById('cards').style.display = 'grid';
    }
}

// Only changes ALL CAPS text, so names like "FlexOne" are left alone
function toTitleCase(s) {
    if (!s) return '';
    if (s !== s.toUpperCase()) return s;
    return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function formatAccountType(t) {
    const map = {
        TRANSACTION: 'Current account',
        SAVINGS: 'Savings account',
        BUSINESS_TRANSACTION: 'Business current account',
        BUSINESS_SAVINGS: 'Business savings account'
    };
    return map[t] || toTitleCase(String(t || '').replace(/_/g, ' ')) || 'Account';
}

function addDetail(parent, label, value, divider) {
    const p = document.createElement('p');
    if (divider) {
        p.style.marginTop = '12px';
        p.style.paddingTop = '12px';
        p.style.borderTop = '1px solid #e5e5e5';
    }
    const strong = document.createElement('strong');
    strong.textContent = label + ': ';
    p.appendChild(strong);
    p.appendChild(document.createTextNode(value));
    parent.appendChild(p);
}

// Bank logo + name row. Uses account.logoUrl if the backend returns one,
// otherwise falls back to the bank's initial.
function buildBankRow(account) {
    const row = document.createElement('div');
    row.className = 'bank-row';

    const name = toTitleCase(account.institutionName) || 'Your bank';
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
        errorInfo.innerHTML = '';
        const errP = document.createElement('p');
        const errLabel = document.createElement('strong');
        errLabel.textContent = 'Error: ';
        errP.appendChild(errLabel);
        errP.appendChild(document.createTextNode(error));
        const todoP = document.createElement('p');
        const todoLabel = document.createElement('strong');
        todoLabel.textContent = 'What to do: ';
        todoP.appendChild(todoLabel);
        todoP.appendChild(document.createTextNode('Click "Try Again" to restart the verification process. If the problem persists, please contact support.'));
        errorInfo.appendChild(errP);
        errorInfo.appendChild(todoP);
    }

    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
}

// Retry button handler
document.getElementById('retryBtn').addEventListener('click', () => {
    document.getElementById('error').classList.remove('active');
    document.getElementById('header').style.display = 'block';
    document.getElementById('cards').style.display = 'grid';
});

// New QR code after expiry
document.getElementById('qrRefreshBtn').addEventListener('click', showQRCode);

// ---- Link parameters screen (method list only) ----
document.getElementById('paramsLink').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('header').style.display = 'none';
    document.getElementById('cards').style.display = 'none';
    document.getElementById('params').classList.add('active');
});

document.getElementById('paramsBackBtn').addEventListener('click', () => {
    document.getElementById('params').classList.remove('active');
    document.getElementById('header').style.display = 'block';
    document.getElementById('cards').style.display = 'grid';
});

document.querySelectorAll('.copy-param').forEach((btn) => {
    btn.addEventListener('click', async () => {
        const link = window.location.origin + window.location.pathname + btn.dataset.query;
        try {
            await navigator.clipboard.writeText(link);
            btn.textContent = 'Copied';
        } catch (err) {
            btn.textContent = 'Failed';
        }
        setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
    });
});

// QR back button handler
document.getElementById('qrBackBtn').addEventListener('click', () => {
    stopPolling();
    document.getElementById('qr').classList.remove('active');
    document.getElementById('header').style.display = 'block';
    document.getElementById('cards').style.display = 'grid';
});

// ---- SMS verification ----
function showSMSVerification() {
    document.getElementById('header').style.display = 'none';
    document.getElementById('cards').style.display = 'none';
    document.getElementById('sms').classList.add('active');
    document.getElementById('smsPhoneStep').style.display = 'block';
    document.getElementById('smsCodeStep').style.display = 'none';
    document.getElementById('smsPhoneInput').value = '';
    document.getElementById('smsCodeInput').value = '';
    document.getElementById('smsError').style.display = 'none';
    document.getElementById('smsPhoneError').style.display = 'none';
}

const smsCard = document.getElementById('smsCard');
smsCard.addEventListener('click', showSMSVerification);

// Auto-format phone number input
document.getElementById('smsPhoneInput').addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
    e.target.value = value; // Keep only digits
    // Clear error when user starts typing
    document.getElementById('smsPhoneError').style.display = 'none';
});

document.getElementById('smsCancelBtn').addEventListener('click', () => {
    document.getElementById('sms').classList.remove('active');
    document.getElementById('header').style.display = 'block';
    document.getElementById('cards').style.display = 'grid';
});

document.getElementById('smsSendBtn').addEventListener('click', () => {
    const phoneNumber = document.getElementById('smsPhoneInput').value.trim();

    // Remove all non-digit characters
    const digitsOnly = phoneNumber.replace(/\D/g, '');

    // Validate: must be 10 digits and start with 7 (UK mobile: +44 7XXX XXXXXX)
    if (!digitsOnly || digitsOnly.length !== 10 || !digitsOnly.startsWith('7')) {
        document.getElementById('smsPhoneError').textContent = 'Please enter a valid UK mobile number (e.g., 7123 456789)';
        document.getElementById('smsPhoneError').style.display = 'block';
        return;
    }

    // Clear any previous error
    document.getElementById('smsPhoneError').style.display = 'none';

    // Show bottom modal
    document.getElementById('bottomModalOverlay').classList.add('active');
    document.getElementById('bottomModal').classList.add('active');
});

// Bottom modal handlers
document.getElementById('bottomModalCancel').addEventListener('click', () => {
    document.getElementById('bottomModalOverlay').classList.remove('active');
    document.getElementById('bottomModal').classList.remove('active');
});

document.getElementById('bottomModalOverlay').addEventListener('click', () => {
    document.getElementById('bottomModalOverlay').classList.remove('active');
    document.getElementById('bottomModal').classList.remove('active');
});

document.getElementById('bottomModalContinue').addEventListener('click', async () => {
    // Hide modal
    document.getElementById('bottomModalOverlay').classList.remove('active');
    document.getElementById('bottomModal').classList.remove('active');

    const phoneInput = document.getElementById('smsPhoneInput').value.trim();
    const phoneNumber = '+44' + phoneInput.replace(/\D/g, '');

    document.getElementById('smsSendBtn').textContent = 'Sending...';
    document.getElementById('smsSendBtn').disabled = true;

    try {
        const response = await fetch(SEND_SMS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ phoneNumber })
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('smsPhoneStep').style.display = 'none';
            document.getElementById('smsCodeStep').style.display = 'block';
            document.getElementById('smsPhoneDisplay').textContent = '+44 ' + document.getElementById('smsPhoneInput').value.replace(/\D/g, '');
            document.getElementById('smsCodeInput').focus();

            // Show resend button after 30 seconds
            setTimeout(() => {
                document.getElementById('smsResendBtn').style.display = 'inline-block';
            }, 30000);
        } else {
            document.getElementById('smsError').textContent = data.error || 'Failed to send SMS';
            document.getElementById('smsError').style.display = 'block';
        }
    } catch (err) {
        document.getElementById('smsError').textContent = 'Failed to send SMS. Please try again.';
        document.getElementById('smsError').style.display = 'block';
    } finally {
        document.getElementById('smsSendBtn').textContent = 'Send Code';
        document.getElementById('smsSendBtn').disabled = false;
    }
});

document.getElementById('smsVerifyBtn').addEventListener('click', async () => {
    const code = document.getElementById('smsCodeInput').value.trim();
    const phoneNumber = document.getElementById('smsPhoneDisplay').textContent;

    if (!code || code.length !== 6) {
        document.getElementById('smsError').textContent = 'Please enter a 6-digit code';
        document.getElementById('smsError').style.display = 'block';
        return;
    }

    document.getElementById('smsVerifyBtn').textContent = 'Verifying...';
    document.getElementById('smsVerifyBtn').disabled = true;

    try {
        const response = await fetch(VERIFY_SMS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ phoneNumber, code })
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('sms').classList.remove('active');
            showCompletionSuccess();
            document.getElementById('smsSuccessTick').style.display = 'flex';
        } else {
            document.getElementById('smsError').textContent = data.error || 'Invalid code';
            document.getElementById('smsError').style.display = 'block';

            if (data.remainingAttempts !== undefined) {
                document.getElementById('smsError').textContent += ` (${data.remainingAttempts} attempts remaining)`;
            }
        }
    } catch (err) {
        document.getElementById('smsError').textContent = 'Failed to verify. Please try again.';
        document.getElementById('smsError').style.display = 'block';
    } finally {
        document.getElementById('smsVerifyBtn').textContent = 'Verify';
        document.getElementById('smsVerifyBtn').disabled = false;
    }
});

document.getElementById('smsResendBtn').addEventListener('click', async () => {
    const phoneNumber = document.getElementById('smsPhoneDisplay').textContent;

    document.getElementById('smsResendBtn').textContent = 'Sending...';
    document.getElementById('smsResendBtn').disabled = true;

    try {
        const response = await fetch(SEND_SMS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ phoneNumber })
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('smsError').style.display = 'none';
            document.getElementById('smsCodeInput').value = '';
            document.getElementById('smsCodeInput').focus();

            // Reset resend timer
            document.getElementById('smsResendBtn').style.display = 'none';
            setTimeout(() => {
                document.getElementById('smsResendBtn').style.display = 'inline-block';
            }, 30000);
        } else {
            document.getElementById('smsError').textContent = data.error || 'Failed to resend SMS';
            document.getElementById('smsError').style.display = 'block';
        }
    } catch (err) {
        document.getElementById('smsError').textContent = 'Failed to resend SMS. Please try again.';
        document.getElementById('smsError').style.display = 'block';
    } finally {
        document.getElementById('smsResendBtn').textContent = 'Resend';
        document.getElementById('smsResendBtn').disabled = false;
    }
});

// ?method=bank, ?method=human, or ?method=sms skips the method list
(function () {
    if (error || authCode) return;
    const method = (urlParams.get("method") || "").toLowerCase();
    if (method === "bank") {
        showConsent();
    } else if (method === "human" && !isMobile) {
        showQRCode();
    } else if (method === "sms") {
        showSMSVerification();
    }
})();
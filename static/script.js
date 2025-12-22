// CONFIGURATION
let CLIENT_ID = null;
const SCOPE = 'email profile openid';

// ROUTING & STATE MANAGEMENT

document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname;

    // 1. Load Config
    await fetchConfig();

    // 2. Routing Logic
    if (path === '/oauth2/callback') {
        handleCallback();
    } else {
        checkSession();
    }
});

async function fetchConfig() {
    try {
        const response = await fetch('/auth/config');
        if (!response.ok) throw new Error('Failed to load auth config');
        const data = await response.json();
        CLIENT_ID = data.client_id;

        const statusEl = document.getElementById('config-status');
        if (statusEl) {
            statusEl.textContent = "OK";
            statusEl.style.color = "#10b981";
        }

        const uri = getRedirectUri();
        const debugEl = document.getElementById('debug-redirect');
        if (debugEl) debugEl.textContent = uri;

    } catch (err) {
        console.error(err);
        const statusEl = document.getElementById('config-status');
        if (statusEl) {
            statusEl.textContent = "Error";
            statusEl.style.color = "#ef4444";
        }
        showError("Failed to connect to server. Please check .env configuration.");
        const btn = document.getElementById('google-login-btn');
        if (btn) {
            btn.disabled = true;
            btn.style.opacity = "0.5";
        }
    }
}

function getRedirectUri() {
    let origin = window.location.origin;
    if (window.location.hostname === '127.0.0.1') {
        origin = origin.replace('127.0.0.1', 'localhost');
    }
    return origin + '/oauth2/callback';
}

function showView(viewId) {
    ['login-view', 'loading-view', 'dashboard-view'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    const view = document.getElementById(viewId);
    if (view) view.classList.remove('hidden');
}

function showError(msg) {
    const el = document.getElementById('error-message');
    if (el) {
        el.textContent = msg;
        el.style.display = 'block';
    }
}

// AUTH LOGIC

function initiateOAuth() {
    if (!CLIENT_ID) {
        showError('Client ID not loaded. Please refresh the page.');
        return;
    }

    const redirectUri = getRedirectUri();

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=token` +
        `&scope=${encodeURIComponent(SCOPE)}` +
        `&include_granted_scopes=true` +
        `&state=pass-through-value`;

    window.location.href = authUrl;
}

function handleCallback() {
    showView('loading-view');

    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const error = params.get('error');

    if (accessToken) {
        localStorage.setItem('auth_token', accessToken);
        
        // Set fresh login flag to trigger new chatbot session
        localStorage.setItem('fresh_login', 'true');
        
        window.location.href = '/home';
    } else if (error) {
        alert('Authentication Error: ' + error);
        window.location.href = '/home';
    } else {
        window.location.href = '/home';
    }
}

function checkSession() {
    const token = localStorage.getItem('auth_token');
    if (token) {
        showView('dashboard-view');
        fetchUserProfile(token);
    } else {
        showView('login-view');
    }
}

async function fetchUserProfile(token) {
    try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user profile');
        }

        const userData = await response.json();
        
        document.getElementById('user-name').textContent = userData.name;
        document.getElementById('user-email').textContent = userData.email;
        
        if (userData.picture) {
            document.getElementById('user-avatar').src = userData.picture;
        }

        // Initialize new chatbot session if fresh login
        initializeChatbotSession();

    } catch (error) {
        console.error("Profile Fetch Error:", error);
        if (error.message.includes('Failed')) {
            logout();
        }
    }
}


function initializeChatbotSession() {
    const isFreshLogin = localStorage.getItem('fresh_login') === 'true';
    
    if (isFreshLogin) {
        localStorage.removeItem('fresh_login');
        
        const initNewSession = () => {
            // Set pending flag FIRST to block loadHistory()
            window.chatbot.pendingNewSession = true;
            window.chatbot.forceNewSession();
        };
        
        if (window.chatbot) {
            initNewSession();
        } else {
            const checkChatbot = setInterval(() => {
                if (window.chatbot) {
                    clearInterval(checkChatbot);
                    initNewSession();
                }
            }, 50);
            
            setTimeout(() => clearInterval(checkChatbot), 5000);
        }
    }
}

function logout() {
    localStorage.removeItem('auth_token');
    
    // Clear chatbot session data on logout
    localStorage.removeItem('fresh_login');
    
    // Reset chatbot if it exists
    if (window.chatbot) {
        window.chatbot.clearSessionData();
    }
    
    document.getElementById('user-name').textContent = 'Loading...';
    document.getElementById('user-email').textContent = '...';
    document.getElementById('user-avatar').src = 'https://via.placeholder.com/80';
    
    showView('login-view');
}
// Auth state
let currentUser = null;
let authToken = null;

// DOM Elements
const authSection = document.querySelector('.auth-section');
const appSection = document.querySelector('.app-section');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const welcomeMessage = document.getElementById('welcomeMessage');

// Check if we're on HTTPS
const protocol = window.location.protocol;
const baseUrl = `${protocol}//${window.location.host}`;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    setupAuthListeners();
});

function setupAuthListeners() {
    // Login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        try {
            const response = await fetch(`${baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                authToken = data.token;
                currentUser = data.user;
                localStorage.setItem('authToken', authToken);
                showApp();
                showNotification('Login successful!', 'success');
            } else {
                throw new Error(data.message || 'Login failed');
            }
        } catch (error) {
            console.error('Login error:', error);
            showNotification(error.message, 'error');
        }
    });

    // Register form submission
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('regUsername').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        
        try {
            const response = await fetch(`${baseUrl}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showNotification('Registration successful! Please log in.', 'success');
                toggleForms(); // Switch to login form
                // Clear registration form
                registerForm.reset();
            } else {
                throw new Error(data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            showNotification(error.message, 'error');
        }
    });

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
}

// Check authentication state
async function checkAuthState() {
    const token = localStorage.getItem('authToken');
    if (token) {
        try {
            const response = await fetch(`${baseUrl}/api/auth/verify`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                authToken = token;
                currentUser = data.user;
                showApp();
            } else {
                throw new Error('Invalid token');
            }
        } catch (error) {
            console.error('Auth check error:', error);
            localStorage.removeItem('authToken');
            showAuth();
        }
    } else {
        showAuth();
    }
}

// Show authentication section
function showAuth() {
    authSection.style.display = 'flex';
    appSection.style.display = 'none';
}

// Show main app section
function showApp() {
    authSection.style.display = 'none';
    appSection.style.display = 'block';
    if (currentUser) {
        welcomeMessage.textContent = `Welcome, ${currentUser.username}!`;
    }
}

// Logout function
async function logout() {
    try {
        const response = await fetch(`${baseUrl}/api/auth/logout`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            localStorage.removeItem('authToken');
            authToken = null;
            currentUser = null;
            showAuth();
            showNotification('Logged out successfully', 'success');
        } else {
            throw new Error('Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showNotification(error.message, 'error');
    }
}

// Helper function to get auth headers
function getAuthHeaders() {
    return {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
    };
}

// Export necessary functions and variables
window.getAuthHeaders = getAuthHeaders;
window.currentUser = currentUser; 
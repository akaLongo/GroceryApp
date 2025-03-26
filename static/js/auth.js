// Authentication state
let currentUser = null;
let authToken = localStorage.getItem('authToken');

// Event listeners for auth forms
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const logoutBtn = document.getElementById('logoutBtn');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Check if user is already logged in
    checkAuthState();
});

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Store token and user data
            localStorage.setItem('authToken', data.token);
            currentUser = data.user;
            authToken = data.token;
            
            // Update UI
            document.querySelector('.auth-section').style.display = 'none';
            document.querySelector('.app-section').style.display = 'block';
            document.getElementById('welcomeMessage').textContent = `Welcome, ${currentUser.username}!`;
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please try again.');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const email = document.getElementById('regEmail').value;

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password, email })
        });

        const data = await response.json();

        if (response.ok) {
            // Store token and user data
            localStorage.setItem('authToken', data.token);
            currentUser = data.user;
            authToken = data.token;
            
            // Update UI
            document.querySelector('.auth-section').style.display = 'none';
            document.querySelector('.app-section').style.display = 'block';
            document.getElementById('welcomeMessage').textContent = `Welcome, ${currentUser.username}!`;
        } else {
            alert(data.error || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        alert('Registration failed. Please try again.');
    }
}

async function handleLogout() {
    try {
        const response = await fetch('/logout', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            }
        });

        if (response.ok) {
            // Clear auth state
            localStorage.removeItem('authToken');
            currentUser = null;
            authToken = null;
            
            // Update UI
            document.querySelector('.auth-section').style.display = 'block';
            document.querySelector('.app-section').style.display = 'none';
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
}

async function checkAuthState() {
    if (authToken) {
        try {
            // Verify token is valid by making a request
            const response = await fetch('/api/items', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (response.ok) {
                // Token is valid, show app section
                document.querySelector('.auth-section').style.display = 'none';
                document.querySelector('.app-section').style.display = 'block';
            } else {
                // Token is invalid, show auth section
                localStorage.removeItem('authToken');
                document.querySelector('.auth-section').style.display = 'block';
                document.querySelector('.app-section').style.display = 'none';
            }
        } catch (error) {
            console.error('Auth check error:', error);
            document.querySelector('.auth-section').style.display = 'block';
            document.querySelector('.app-section').style.display = 'none';
        }
    } else {
        // No token, show auth section
        document.querySelector('.auth-section').style.display = 'block';
        document.querySelector('.app-section').style.display = 'none';
    }
}

// Helper function to get auth headers
function getAuthHeaders() {
    return {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
    };
} 
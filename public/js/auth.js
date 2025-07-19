// public/js/auth.js - Unified Frontend JWT Authentication

/**
 * JWT Token Management for Frontend - CONSISTENT with main.js
 */
class AuthManager {
  constructor() {
    this.TOKEN_KEY = 'token'; // Match main.js usage
    this.USER_KEY = 'user_data';
  }

  /**
   * Store JWT token - using localStorage to match main.js
   */
  setToken(token, userData = null) {
    localStorage.setItem(this.TOKEN_KEY, token); // Use localStorage, not sessionStorage
    if (userData) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(userData));
    }
    console.log('✅ Token stored successfully');
  }

  /**
   * Alias for setToken - matches main.js usage
   */
  storeAuthData(token, userData = null) {
    this.setToken(token, userData);
  }

  /**
   * Get stored JWT token
   */
  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Get stored user data
   */
  getUserData() {
    const userData = localStorage.getItem(this.USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      // Basic token format validation
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp > Date.now() / 1000;
    } catch (e) {
      console.warn('Token validation failed:', e);
      return false;
    }
  }

  /**
   * Check if user is admin
   */
  isAdmin() {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.isAdmin === true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get Authorization headers for API requests
   */
  getAuthHeaders() {
    const token = this.getToken();
    if (!token) {
      console.warn('No token found in localStorage');
      return {};
    }
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Logout user - clear all stored data
   */
  logout() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    console.log('✅ Auth data cleared');
  }

  /**
   * Alias for logout - matches main.js usage
   */
  clearAuthData() {
    this.logout();
  }

  /**
   * Handle API responses - check for authentication errors
   */
  handleApiResponse(response) {
    if (response.status === 401) {
      console.error('Authentication failed, clearing auth data');
      this.logout();
      window.location.href = '/';
      return;
    }
    return response;
  }
}

// Create global instance immediately
window.authManager = new AuthManager();

/**
 * MAIN authenticated fetch function - matches admin.js style
 */
async function makeAuthenticatedRequest(url, options = {}) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    console.error('No token found for authenticated request');
    window.location.href = '/';
    return null;
  }

  const authHeaders = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers
  };

  console.log(`🔐 Making authenticated request to: ${url}`);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: authHeaders
    });

    if (response.status === 401) {
      console.error('Token expired or invalid, redirecting to login');
      localStorage.removeItem('token');
      window.location.href = '/';
      return null;
    }

    return response;
  } catch (error) {
    console.error('Authenticated request failed:', error);
    throw error;
  }
}

/**
 * Alias for compatibility - points to main function
 */
async function authenticatedFetch(url, options = {}) {
  return await makeAuthenticatedRequest(url, options);
}

/**
 * Helper function for auth headers (matches admin.js)
 */
function getAuthHeaders() {
  return window.authManager.getAuthHeaders();
}

/**
 * Check admin access (matches admin.js)
 */
function checkAdminAccess() {
  return window.authManager.isAdmin();
}

/**
 * Authentication check function
 */
function checkAuthentication() {
  const token = localStorage.getItem('token');
  if (!token) {
    console.log('No token found, redirecting to login');
    window.location.href = '/';
    return false;
  }
  return true;
}

/**
 * Login function - handles JWT token storage
 */
async function login(phone, password) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phone, password })
    });

    const data = await response.json();

    if (response.ok && data.token) {
      // Store token and user data
      window.authManager.setToken(data.token, data.user);
      return { success: true, user: data.user };
    } else {
      return { success: false, error: data.error || 'Login failed' };
    }
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Register function - handles JWT token storage
 */
async function register(phone, password, referralCode = '') {
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ phone, password, referralCode })
    });

    const data = await response.json();

    if (response.ok && data.token) {
      // Store token and user data
      window.authManager.setToken(data.token, data.user);
      return { success: true, user: data.user };
    } else {
      return { success: false, error: data.error || 'Registration failed' };
    }
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: 'Network error' };
  }
}

/**
 * Logout function
 */
function logout() {
  window.authManager.logout();
  window.location.href = '/';
}

/**
 * Protect page - redirect to login if not authenticated
 */
function requireAuth() {
  if (!window.authManager.isAuthenticated()) {
    window.location.href = '/';
    return false;
  }
  return true;
}

/**
 * Protect admin page - redirect if not admin
 */
function requireAdmin() {
  if (!window.authManager.isAuthenticated() || !window.authManager.isAdmin()) {
    window.location.href = '/';
    return false;
  }
  return true;
}

// Make ALL functions globally available
window.getAuthHeaders = getAuthHeaders;
window.makeAuthenticatedRequest = makeAuthenticatedRequest;
window.checkAdminAccess = checkAdminAccess;
window.checkAuthentication = checkAuthentication;
window.authenticatedFetch = authenticatedFetch;
window.login = login;
window.register = register;
window.logout = logout;
window.requireAuth = requireAuth;
window.requireAdmin = requireAdmin;

console.log('🔧 Auth.js loaded - all functions available globally');
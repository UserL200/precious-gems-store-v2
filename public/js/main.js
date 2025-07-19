// Wait for both DOM and auth.js to be ready
function waitForAuthManager() {
  return new Promise((resolve) => {
    if (window.authManager) {
      resolve();
    } else {
      const checkAuthManager = () => {
        if (window.authManager) {
          resolve();
        } else {
          setTimeout(checkAuthManager, 10);
        }
      };
      checkAuthManager();
    }
  });
}

// Main initialization
document.addEventListener('DOMContentLoaded', async () => {
  // Wait for authManager to be available
  await waitForAuthManager();
  
  document.getElementById('authSection').classList.add('hidden');
  document.getElementById('dashboard').classList.add('hidden');
  
  // Show a loading indicator (optional)
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'loading';
  loadingDiv.innerHTML = `
    <div style="text-align: center; padding: 2rem;">
      <div style="font-size: 1.5rem; margin-bottom: 1rem;">💎</div>
      <div>Loading...</div>
    </div>
  `;
  document.body.appendChild(loadingDiv);
  
  // Get inviteCode from URL
  const params = new URLSearchParams(window.location.search);
  const inviteCode = params.get('inviteCode');

  const copyBtn = document.getElementById('copyReferralBtn');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const registerBtn = document.getElementById('showRegisterBtn');
  const referralInput = document.getElementById('regRef');

  // Initial cart render
  if (typeof renderCart === 'function') {
    renderCart();
  }

  // Toggle collapsible sections
  document.querySelectorAll('.toggle-section').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const targetId = toggle.getAttribute('data-target');
      const target = document.getElementById(targetId);
      const icon = toggle.querySelector('span:last-child');

      if (target) {
        const isExpanded = target.classList.contains('expanded');
        target.classList.toggle('expanded', !isExpanded);
        if (icon) icon.textContent = isExpanded ? '▼' : '▲';
      }
    });
  });

  // Copy referral link to clipboard
  if (copyBtn && typeof copyReferralLink === 'function') {
    copyBtn.addEventListener('click', copyReferralLink);
  }

  // Handle checkout
  if (checkoutBtn && typeof checkout === 'function') {
    checkoutBtn.addEventListener('click', checkout);
  }

  // If inviteCode exists, prefill referral input and open registration
  if (inviteCode && referralInput && registerBtn) {
    referralInput.value = inviteCode;
    referralInput.readOnly = true;
    registerBtn.click(); // Open registration form
  }

  // Initialize authentication check
  checkAuth();
});

// Handle switching views
document.getElementById('showRegisterBtn').addEventListener('click', () => {
  document.getElementById('registerForm').classList.remove('hidden');
  document.getElementById('loginForm').classList.add('hidden');
  document.getElementById('authMsg').innerText = '';
});

document.getElementById('showLoginBtn').addEventListener('click', () => {
  document.getElementById('loginForm').classList.remove('hidden');
  document.getElementById('registerForm').classList.add('hidden');
  document.getElementById('authMsg').innerText = '';
});

// Fixed Login Function for main.js
document.getElementById('loginBtn').addEventListener('click', async () => {
  const phone = document.getElementById('logPhone').value;
  const password = document.getElementById('logPass').value;

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    });

    const data = await response.json();
    
    if (response.ok) {
      // Use authManager to store token consistently
      window.authManager.storeAuthData(data.token, data.user);
      console.log('✅ Login successful, token saved');
      
      if (data.user.isAdmin) {
        console.log('🔧 Redirecting to admin dashboard');
        window.location.href = '/admin';
      } else {
        console.log('👤 Loading user dashboard');
        showDashboard();
        loadDashboard();
      }
    } else {
      document.getElementById('authMsg').innerText = data.error || 'Login failed';
    }
  } catch (error) {
    console.error('Login error:', error);
    document.getElementById('authMsg').innerText = 'Login failed';
  }
});

// Also fix your register function:
document.getElementById('registerBtn').addEventListener('click', async () => {
  const phone = document.getElementById('regPhone').value;
  const password = document.getElementById('regPass').value;
  const referralCode = document.getElementById('regRef').value;

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password, referralCode })
    });

    const data = await response.json();
    
    if (response.ok) {
      // Use authManager to store token consistently
      window.authManager.storeAuthData(data.token, data.user);
      
      if (data.user.isAdmin) {
        window.location.href = '/admin';
      } else {
        showDashboard();
        loadDashboard();
      }
    } else {
      document.getElementById('authMsg').innerText = data.error || 'Registration failed';
    }
  } catch (error) {
    console.error('Registration error:', error);
    document.getElementById('authMsg').innerText = 'Registration failed';
  }
});

// Logout - Updated for JWT
document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    // Call logout endpoint with JWT token
    await window.authenticatedFetch('/api/auth/logout', { method: 'POST' });
  } catch (error) {// Enhanced JWT Middleware with debugging
const { verifyToken, extractTokenFromHeader } = require('../utils/jwt');

/**
 * JWT Authentication Middleware with enhanced debugging
 */
const authenticateToken = (req, res, next) => {
  try {
    console.log('🔍 Auth middleware - Headers:', {
      authorization: req.headers['authorization'],
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent']?.substring(0, 50) + '...'
    });
    
    const authHeader = req.headers['authorization'];
    const token = extractTokenFromHeader(authHeader);
    
    console.log('🔍 Auth middleware - Token extracted:', token ? 'Found' : 'Not found');
    
    if (!token) {
      console.log('❌ Auth middleware - No token provided');
      return res.status(401).json({ 
        error: 'Access token required',
        details: 'No authorization header or token found'
      });
    }
    
    const decoded = verifyToken(token);
    console.log('🔍 Auth middleware - Token decoded:', {
      userId: decoded.userId,
      phone: decoded.phone,
      isAdmin: decoded.isAdmin
    });
    
    // Attach user info to request object
    req.user = {
      userId: decoded.userId,
      phone: decoded.phone,
      isAdmin: decoded.isAdmin || false,
      referralCode: decoded.referralCode
    };
    
    console.log('✅ Auth middleware - User attached to request:', req.user.userId);
    next();
    
  } catch (error) {
    console.error('💥 JWT authentication error:', error);
    console.error('💥 Auth middleware - Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });
    
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Admin Authorization Middleware with better error handling
 */
const requireAdmin = (req, res, next) => {
  console.log('🔍 Admin middleware - Checking user:', req.user);
  
  if (!req.user) {
    console.log('❌ Admin middleware - No user object');
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!req.user.isAdmin) {
    console.log('❌ Admin middleware - User not admin:', req.user.userId);
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  console.log('✅ Admin middleware - Access granted to:', req.user.userId);
  next();
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = extractTokenFromHeader(authHeader);
    
    if (token) {
      const decoded = verifyToken(token);
      req.user = {
        userId: decoded.userId,
        phone: decoded.phone,
        isAdmin: decoded.isAdmin || false,
        referralCode: decoded.referralCode
      };
      console.log('✅ Optional auth - User authenticated:', req.user.userId);
    } else {
      console.log('ℹ️ Optional auth - No token provided, continuing without auth');
    }
    
    next();
  } catch (error) {
    console.log('ℹ️ Optional auth - Token invalid, continuing without auth:', error.message);
    next();
  }
};

module.exports = {
  authenticateToken,
  requireAdmin,
  optionalAuth
};
    console.error('Logout error:', error);
  } finally {
    // Clear local auth data regardless of API response
    window.authManager.clearAuthData();
    window.location.reload();
  }
});

// Show dashboard - Unchanged
function showDashboard() {
  document.getElementById('authSection').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('showRegisterBtn').classList.add('hidden');
  document.getElementById('showLoginBtn').classList.add('hidden');
  document.getElementById('logoutBtn').classList.remove('hidden');

  loadProducts();
  loadReferrals();
}

// Load dashboard - Updated for JWT
async function loadDashboard() {
  try {
    console.log('📡 Fetching /api/stats...');

    const statsResponse = await window.authenticatedFetch('/api/referrals/stats');
    const stats = await statsResponse.json();

    console.log('📊 Stats response status:', statsResponse.status);
    console.log('📊 Stats response headers:', [...statsResponse.headers.entries()]);
    
    // Fetch balance data  
    const balanceResponse = await window.authenticatedFetch('/api/withdrawals/balance');
    const balance = await balanceResponse.json();
    
    // Update dashboard elements
    document.getElementById('totalPurchases').innerText = stats.totalPurchases || 0;
    document.getElementById('referralCode').innerText = stats.referralCode || '-';
    document.getElementById('commissionEarned').innerText = `R${(stats.totalCommission || 0).toFixed(2)}`;
    
    // FIX: Use balance.balance instead of stats.totalSpent for wallet
    document.getElementById('total').innerText = `R${(balance.balance || 0).toFixed(2)}`;
    
    if (stats.referralCode) {
      const link = `${window.location.origin}?inviteCode=${stats.referralCode}`;
      const referralLinkElem = document.getElementById('referralLink');
      if (referralLinkElem) {
        referralLinkElem.innerText = link;
      }
    }
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
}

// Authentication check - Updated for JWT
async function checkAuth() {
  try {
    // Check if we have a token
    if (!window.authManager.isAuthenticated()) {
      // Remove loading indicator
      const loadingDiv = document.getElementById('loading');
      if (loadingDiv) loadingDiv.remove();
      
      // Not logged in - show auth section
      document.getElementById('authSection').classList.remove('hidden');
      document.getElementById('dashboard').classList.add('hidden');
      return;
    }

    // Verify token with server
    const response = await window.authenticatedFetch('/api/auth/me');
    
    // Remove loading indicator
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) loadingDiv.remove();
    
    if (response.ok) {
      const data = await response.json();
      if (data.isAdmin) {
        window.location.href = '/admin';
      } else {
        showDashboard();
        loadDashboard();
      }
    } else {
      // Token invalid - clear auth data and show auth section
      window.authManager.clearAuthData();
      document.getElementById('authSection').classList.remove('hidden');
      document.getElementById('dashboard').classList.add('hidden');
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    
    // Clear auth data on error
    window.authManager.clearAuthData();
    
    // Remove loading indicator and show auth section on error
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) loadingDiv.remove();
    
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
  }
}

// Cart - All functions updated for JWT
// Global cart state
let cart = [];
let products = []; // Store products data for reference

// Load products - Updated for JWT
async function loadProducts() {
  try {
    const response = await window.authenticatedFetch('/api/products');
    products = await response.json();
    const list = document.getElementById('productList');
    list.innerHTML = '';

    products.forEach(p => {
      const options = (p.id % 2 === 0)
        ? [300, 500, 1000, 3800, 6000]
        : [100, 250, 500, 700, 1000, 2500];

      const div = document.createElement('div');
      div.className = 'product-card';

      div.innerHTML = `
        <img src="${p.imageUrl}" alt="${p.name}" class="product-image">
        <div class="product-info">
          <div class="product-name">${p.name}</div>
          <div class="product-type">${p.type}</div>
          <div class="product-price">Choose an investment:</div>
          <div class="price-options"></div>
        </div>
      `;

      const priceOptionsDiv = div.querySelector('.price-options');

      options.forEach(price => {
        const priceBtn = document.createElement('button');
        priceBtn.className = 'btn btn-secondary';
        priceBtn.innerText = `R${price}`;
        priceBtn.addEventListener('click', () => addToCart(p.id, price, p.name, p.type));
        priceOptionsDiv.appendChild(priceBtn);
      });

      list.appendChild(div);
    });
  } catch (error) {
    console.error('Error loading products:', error);
  }
}

// Enhanced addToCart function - Unchanged
function addToCart(productId, price, name, type) {
  const existingItem = cart.find(item => item.productId === productId && item.price === price);
  
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ 
      productId, 
      price, 
      name, 
      type, 
      quantity: 1 
    });
  }
  
  renderCart();
  showCartAnimation();
}

// Remove item from cart - Unchanged
function removeFromCart(productId, price) {
  cart = cart.filter(item => !(item.productId === productId && item.price === price));
  renderCart();
}

// Update quantity - Unchanged
function updateQuantity(productId, price, change) {
  const item = cart.find(item => item.productId === productId && item.price === price);
  if (item) {
    item.quantity += change;
    if (item.quantity <= 0) {
      removeFromCart(productId, price);
    } else {
      renderCart();
    }
  }
}

// Enhanced renderCart function - Unchanged
function renderCart() {
  const cartDiv = document.getElementById('cart');
  const checkoutBtn = document.getElementById('checkoutBtn');
  
  if (cart.length === 0) {
    cartDiv.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛒</div>
        <div>Your gem collection is empty</div>
        <small style="opacity: 0.7; margin-top: 0.5rem; display: block;">
          Select a precious gem to start your investment journey
        </small>
      </div>
    `;
    cartDiv.classList.remove('has-items');
    checkoutBtn.disabled = true;
    checkoutBtn.style.opacity = '0.6';
    return;
  }

  cartDiv.classList.add('has-items');
  checkoutBtn.disabled = false;
  checkoutBtn.style.opacity = '1';

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  let cartHTML = '';
  
  cart.forEach(item => {
    cartHTML += `
      <div class="cart-content">
        <div class="cart-gem-icon">💎</div>
        <div class="cart-details">
          <div class="cart-product-name">${item.name}</div>
          <div class="cart-price">R${item.price.toLocaleString()}</div>
          <div class="cart-quantity">
            <button class="cart-quantity-btn" onclick="updateQuantity(${item.productId}, ${item.price}, -1)">−</button>
            <span class="cart-quantity-display">${item.quantity}</span>
            <button class="cart-quantity-btn" onclick="updateQuantity(${item.productId}, ${item.price}, 1)">+</button>
          </div>
        </div>
        <button class="cart-remove" onclick="removeFromCart(${item.productId}, ${item.price})">
          🗑️ Remove
        </button>
      </div>
    `;
  });

  // Add total section
  if (cart.length > 1 || cart[0].quantity > 1) {
    cartHTML += `
      <div class="cart-total">
        <div class="cart-total-label">${totalItems} ${totalItems === 1 ? 'Gem' : 'Gems'} Selected</div>
        <div class="cart-total-amount">R${totalAmount.toLocaleString()}</div>
      </div>
    `;
  }

  cartDiv.innerHTML = cartHTML;
}

// Show cart animation - Unchanged
function showCartAnimation() {
  const cartDiv = document.getElementById('cart');
  
  // Add a brief highlight effect
  cartDiv.style.transform = 'scale(1.02)';
  cartDiv.style.transition = 'transform 0.2s ease';
  
  setTimeout(() => {
    cartDiv.style.transform = 'scale(1)';
  }, 200);

  // Show a subtle notification
  showCartNotification('💎 Gem added to your collection!');
}

// Show cart notifications - Unchanged
function showCartNotification(message) {
  // Remove existing notification
  const existingNotification = document.querySelector('.cart-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement('div');
  notification.className = 'cart-notification';
  notification.innerHTML = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    padding: 1rem 2rem;
    border-radius: 25px;
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
    z-index: 10000;
    font-weight: 600;
    animation: slideDown 0.5s ease-out, fadeOut 0.5s ease-in 2.5s forwards;
  `;

  document.body.appendChild(notification);

  // Remove after 3 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 3000);
}

// Enhanced checkout function - Updated for JWT
async function checkout() {
  const checkoutBtn = document.getElementById('checkoutBtn');
  const originalText = checkoutBtn.innerHTML;

  checkoutBtn.innerHTML = '<div class="cart-loading">Processing your gems...</div>';
  checkoutBtn.disabled = true;

  try {
    const response = await window.authenticatedFetch('/api/cart/checkout', {
      method: 'POST',
      body: JSON.stringify({ items: cart })
    });

    const data = await response.json();

    if (response.ok) {
      checkoutBtn.innerHTML = '✅ Purchase Successful!';
      checkoutBtn.classList.add('cart-success');
      showCartNotification('🎉 Please complete payment below');

      cart = [];
      renderCart();
      loadDashboard();

      setTimeout(() => {
        // Reset checkout button
        checkoutBtn.innerHTML = originalText;
        checkoutBtn.classList.remove('cart-success');
        checkoutBtn.disabled = false;

        // Show payment section
        document.getElementById('dashboard').classList.add('hidden');
        const paymentSection = document.getElementById('paymentSection');
        if (paymentSection) {
          paymentSection.classList.remove('hidden');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 2000);
    } else {
      throw new Error(data.error || 'Checkout failed');
    }

  } catch (error) {
    checkoutBtn.innerHTML = '❌ Purchase Failed';
    showCartNotification('❌ ' + error.message);

    setTimeout(() => {
      checkoutBtn.innerHTML = originalText;
      checkoutBtn.disabled = false;
    }, 3000);
  }
}

// Add CSS for notifications - Unchanged
const notificationCSS = `
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }
  
  @keyframes fadeOut {
    to {
      opacity: 0;
      transform: translateX(-50%) translateY(-20px);
    }
  }
`;

// Inject the CSS
const style = document.createElement('style');
style.textContent = notificationCSS;
document.head.appendChild(style);

// Load withdrawal balance - Updated for JWT
async function loadWithdrawalBalance() {
  try {
    const response = await window.authenticatedFetch('/api/withdrawals/balance');
    
    if (!response.ok) throw new Error('Failed to fetch balance');
    
    const data = await response.json();
    console.log('Withdrawal response:........................', data);
    
    const balanceElem = document.getElementById('withdrawBalance');
    balanceElem.innerText = `R${data.balance.toFixed(2)}`;

    const withdrawAmountInput = document.getElementById('withdrawAmount');
    if (withdrawAmountInput) {
      withdrawAmountInput.max = data.balance.toFixed(2);
      withdrawAmountInput.value = ''; // reset on load
    }
  } catch (err) {
    console.error('Load withdrawal balance error:', err);
  }
}

// Withdrawal form - Updated for JWT
document.getElementById('withdrawForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  console.log('🔍 Form submitted');

  const amountInput = document.getElementById('withdrawAmount');
  const bankInput = document.getElementById('withdrawBank');
  const accountInput = document.getElementById('withdrawAccount');
  const msgElem = document.getElementById('withdrawMsg');

  console.log('🔍 Form elements found:', { amountInput, bankInput, accountInput });

  const amount = parseFloat(amountInput.value);
  const bankName = bankInput.value.trim();
  const accountNumber = accountInput.value.trim();

  console.log('🔍 Form values:', { amount, bankName, accountNumber });

  msgElem.style.color = 'red';
  msgElem.innerText = '';

  if (!amount || amount <= 0) {
    msgElem.innerText = 'Please enter a valid withdrawal amount.';
    return;
  }

  if (!bankName || !accountNumber) {
    msgElem.innerText = 'Please provide bank name and account number.';
    return;
  }

  // Validate amount <= max allowed
  const maxAmount = parseFloat(amountInput.max);
  if (amount > maxAmount) {
    msgElem.innerText = `You can withdraw up to R${maxAmount.toFixed(2)} only.`;
    return;
  }

  try {
    console.log('🔍 About to send fetch request');
    
    const response = await window.authenticatedFetch('/api/withdrawals', {
      method: 'POST',
      body: JSON.stringify({ amount, bankName, accountNumber })
    });
    
    console.log('🔍 Fetch response:', response.status, response.statusText);
    
    const data = await response.json();
    console.log('🔍 Response data:', data);

    if (response.ok) {
      msgElem.style.color = 'green';
      msgElem.innerText = data.message || 'Withdrawal requested successfully!';
      amountInput.value = '';
      bankInput.value = '';
      accountInput.value = '';

      // Refresh balance to reflect new withdrawal
      await loadWithdrawalBalance();
    } else {
      msgElem.innerText = data.error || 'Failed to request withdrawal.';
    }
  } catch (err) {
    console.error('🔍 Fetch error:', err);
    msgElem.innerText = 'Server error. Please try again later.';
  }
});

// Load referrals - Updated for JWT
async function loadReferrals() {
  try {
    const response = await authenticatedFetch('/api/referrals/stats');
    const data = await response.json();
    const tbody = document.getElementById('referralStatsBody');
    tbody.innerHTML = '';

    if (data.referrals && data.referrals.length > 0) {
      data.referrals.forEach((ref, i) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${i + 1}</td>
          <td>${ref.phone || '-'}</td>
          <td>${ref.totalPurchases || 0}</td>
        `;
        tbody.appendChild(row);
      });
    } else {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="4" style="text-align:center;">No referrals yet</td>`;
      tbody.appendChild(row);
    }
  } catch (error) {
    console.error('Error loading referrals:', error);
  }
}

// Copy referral link - Unchanged
function copyReferralLink() {
  const link = document.getElementById('referralLink').innerText;
  navigator.clipboard.writeText(link).then(() => {
    alert('Referral link copied to clipboard!');
  });
}
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('authSection').classList.add('hidden');
  document.getElementById('dashboard').classList.add('hidden');
  
  // Show a loading indicator (optional)
  // const loadingDiv = document.createElement('div');
  // loadingDiv.id = 'loading';
  // loadingDiv.innerHTML = `
  //   <div style="text-align: center; padding: 2rem;">
  //     <div style="font-size: 1.5rem; margin-bottom: 1rem;">💎</div>
  //     <div>Loading...</div>
  //   </div>
  // `;
  // document.body.appendChild(loadingDiv);
  // // Get inviteCode from URL
  const params = new URLSearchParams(window.location.search);
  const inviteCode = params.get('inviteCode');

  const copyBtn = document.getElementById('copyReferralBtn');
  const checkoutBtn = document.getElementById('checkoutBtn');
  const registerBtn = document.getElementById('showRegisterBtn');
  const referralInput = document.getElementById('regRef');
  const originalShowDashboard = showDashboard;
  showDashboard = function() {
    originalShowDashboard();
    setTimeout(() => {
      setupPaymentForm();
    }, 100);}

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
});
// Enhanced TokenManager with better error handling
const TokenManager = {
  set: (token) => {
    try {
      localStorage.setItem('token', token);
      console.log('✅ Token stored successfully');
    } catch (error) {
      console.error('❌ Failed to store token:', error);
    }
  },
  
  get: () => {
    try {
      return localStorage.getItem('token');
    } catch (error) {
      console.error('❌ Failed to get token:', error);
      return null;
    }
  },
  
  remove: () => {
    try {
      localStorage.removeItem('token');
      console.log('✅ Token removed successfully');
    } catch (error) {
      console.error('❌ Failed to remove token:', error);
    }
  },
  
  // Create headers with token
  getHeaders: () => {
    const token = TokenManager.get();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }
};

// Enhanced fetch wrapper for JWT requests
async function fetchWithAuth(url, options = {}) {
  const token = TokenManager.get();
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...TokenManager.getHeaders(),
        ...options.headers
      }
    });
    
    // Handle token expiration
    if (response.status === 401) {
      console.log('🔍 Token expired, logging out...');
      TokenManager.remove();
      showAuthSection();
      throw new Error('Session expired. Please login again.');
    }
    
    return response;
  } catch (error) {
    console.error('❌ Fetch with auth error:', error);
    throw error;
  }
}

// Show auth section with proper cleanup
function showAuthSection() {
  try {
    const authSection = document.getElementById('authSection');
    const dashboard = document.getElementById('dashboard');
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    const showLoginBtn = document.getElementById('showLoginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // Show auth elements
    if (authSection) authSection.classList.remove('hidden');
    if (showRegisterBtn) showRegisterBtn.classList.remove('hidden');
    if (showLoginBtn) showLoginBtn.classList.remove('hidden');
    
    // Hide dashboard elements
    if (dashboard) dashboard.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.add('hidden');
    
    // Clear any error messages
    const authMsg = document.getElementById('authMsg');
    if (authMsg) authMsg.innerText = '';
    
    console.log('✅ Auth section shown');
  } catch (error) {
    console.error('❌ Error showing auth section:', error);
  }
}

// Show dashboard with proper error handling
function showDashboard() {
  try {
    const authSection = document.getElementById('authSection');
    const dashboard = document.getElementById('dashboard');
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    const showLoginBtn = document.getElementById('showLoginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // Hide auth elements
    if (authSection) authSection.classList.add('hidden');
    if (showRegisterBtn) showRegisterBtn.classList.add('hidden');
    if (showLoginBtn) showLoginBtn.classList.add('hidden');
    
    // Show dashboard elements
    if (dashboard) dashboard.classList.remove('hidden');
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    
    // Load dashboard data
    loadProducts();
    loadReferrals();
    
    console.log('✅ Dashboard shown successfully');
  } catch (error) {
    console.error('❌ Error showing dashboard:', error);
  }
}

// Handle switching to registration form
document.getElementById('showRegisterBtn').addEventListener('click', () => {
  try {
    document.getElementById('registerForm').classList.remove('hidden');
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('authMsg').innerText = '';
    console.log('✅ Switched to registration form');
  } catch (error) {
    console.error('❌ Error switching to registration:', error);
  }
});

// Handle switching to login form
document.getElementById('showLoginBtn').addEventListener('click', () => {
  try {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('authMsg').innerText = '';
    console.log('✅ Switched to login form');
  } catch (error) {
    console.error('❌ Error switching to login:', error);
  }
});

// Fixed Registration Handler
document.getElementById('registerBtn').addEventListener('click', async (e) => {
  e.preventDefault();
  
  const phone = document.getElementById('regPhone').value;
  const password = document.getElementById('regPass').value;
  const referralCode = document.getElementById('regRef').value;
  const msgElem = document.getElementById('authMsg');
  const registerBtn = document.getElementById('registerBtn');
  
  // Clear previous messages
  msgElem.innerText = '';
  msgElem.style.color = 'red';
  
  // Validate inputs
  if (!phone || !password) {
    msgElem.innerText = 'Please enter both phone and password';
    return;
  }
  
  if (password.length < 6) {
    msgElem.innerText = 'Password must be at least 6 characters';
    return;
  }
  
  // Show loading state
  const originalText = registerBtn.innerText;
  registerBtn.innerText = 'Creating account...';
  registerBtn.disabled = true;
  
  try {
    console.log('🔍 Attempting registration for phone:', phone);
    
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ phone, password, referralCode })
    });
    
    console.log('🔍 Registration response status:', response.status);
    console.log('🔍 Registration response headers:', [...response.headers.entries()]);
    
    let data;
    try {
      data = await response.json();
      console.log('🔍 Registration response data:', data);
    } catch (parseError) {
      console.error('❌ Failed to parse response as JSON:', parseError);
      throw new Error('Invalid response from server');
    }
    
    // Check if response is ok
    if (!response.ok) {
      throw new Error(data.error || `Server error: ${response.status}`);
    }
    
    // Check if we have a token
    if (!data.token) {
      throw new Error('No token received from server');
    }
    
    // Store JWT token
    TokenManager.set(data.token);
    
    // Check if user is admin
    if (data.user && data.user.isAdmin) {
      console.log('🔍 Admin user detected, redirecting...');
      window.location.href = '/admin';
      return;
    }
    
    // Show success message
    msgElem.style.color = 'green';
    msgElem.innerText = 'Registration successful! Redirecting...';
    
    // Switch to dashboard after short delay
    setTimeout(() => {
      showDashboard();
      loadDashboard();
    }, 1000);
    
  } catch (error) {
    console.error('❌ Registration error:', error);
    msgElem.style.color = 'red';
    msgElem.innerText = error.message || 'Registration failed. Please try again.';
  } finally {
    // Reset button
    registerBtn.innerText = originalText;
    registerBtn.disabled = false;
  }
});

// Fixed Login Handler
document.getElementById('loginBtn').addEventListener('click', async (e) => {
  e.preventDefault();
  
  const phone = document.getElementById('logPhone').value;
  const password = document.getElementById('logPass').value;
  const msgElem = document.getElementById('authMsg');
  const loginBtn = document.getElementById('loginBtn');
  
  // Clear previous messages
  msgElem.innerText = '';
  msgElem.style.color = 'red';
  
  // Validate inputs
  if (!phone || !password) {
    msgElem.innerText = 'Please enter both phone and password';
    return;
  }
  
  // Show loading state
  const originalText = loginBtn.innerText;
  loginBtn.innerText = 'Logging in...';
  loginBtn.disabled = true;
  
  try {
    console.log('🔍 Attempting login for phone:', phone);
    
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ phone, password })
    });
    
    console.log('🔍 Login response status:', response.status);
    console.log('🔍 Login response headers:', [...response.headers.entries()]);
    
    let data;
    try {
      data = await response.json();
      console.log('🔍 Login response data:', data);
    } catch (parseError) {
      console.error('❌ Failed to parse response as JSON:', parseError);
      throw new Error('Invalid response from server');
    }
    
    // Check if response is ok
    if (!response.ok) {
      throw new Error(data.error || `Server error: ${response.status}`);
    }
    
    // Check if we have a token
    if (!data.token) {
      throw new Error('No token received from server');
    }
    
    // Store JWT token
    TokenManager.set(data.token);
    
    // Check if user is admin
    if (data.user && data.user.isAdmin) {
      console.log('🔍 Admin user detected, redirecting...');
      window.location.href = '/admin';
      return;
    }
    
    // Show success message
    msgElem.style.color = 'green';
    msgElem.innerText = 'Login successful! Redirecting...';
    
    // Switch to dashboard after short delay
    setTimeout(() => {
      showDashboard();
      loadDashboard();
    }, 1000);
    
  } catch (error) {
    console.error('❌ Login error:', error);
    msgElem.style.color = 'red';
    msgElem.innerText = error.message || 'Login failed. Please try again.';
  } finally {
    // Reset button
    loginBtn.innerText = originalText;
    loginBtn.disabled = false;
  }
});

// Enhanced Logout Handler
document.getElementById('logoutBtn').addEventListener('click', async (e) => {
  e.preventDefault();
  
  try {
    console.log('🔍 Logging out...');
    
    // Remove token from localStorage
    TokenManager.remove();
    
    // Show auth section
    showAuthSection();
    
    // Optional: Call server logout endpoint if you want to blacklist the token
    // await fetch('/api/auth/logout', { 
    //   method: 'POST', 
    //   headers: TokenManager.getHeaders() 
    // });
    
    console.log('✅ Logged out successfully');
    
  } catch (error) {
    console.error('❌ Logout error:', error);
    // Still show auth section even if server call fails
    showAuthSection();
  }
});

// Fixed loadDashboard function - Updated for JWT authentication
async function loadDashboard() {
  try {
    console.log('📡 Fetching dashboard data...');

    // Fetch stats with JWT authentication
    const statsResponse = await fetchWithAuth('/api/referrals/stats');
    const stats = await statsResponse.json();

    console.log('📊 Stats response status:', statsResponse.status);
    console.log('📊 Stats response data:', stats);
    
    // Fetch balance data with JWT authentication
    const balanceResponse = await fetchWithAuth('/api/withdrawals/balance');
    const balance = await balanceResponse.json();
    
    console.log('💰 Balance response status:', balanceResponse.status);
    console.log('💰 Balance response data:', balance);
    
    // Update dashboard elements with proper null checks
    const totalPurchasesElem = document.getElementById('totalPurchases');
    if (totalPurchasesElem) {
      totalPurchasesElem.innerText = stats.totalPurchases || 0;
    }
    
    const referralCodeElem = document.getElementById('referralCode');
    if (referralCodeElem) {
      referralCodeElem.innerText = stats.referralCode || '-';
    }
    
    const commissionEarnedElem = document.getElementById('commissionEarned');
    if (commissionEarnedElem) {
      commissionEarnedElem.innerText = `R${(stats.totalCommission || 0).toFixed(2)}`;
    }
    
    // Use balance.balance for wallet total
    const totalElem = document.getElementById('total');
    if (totalElem) {
      totalElem.innerText = `R${(balance.balance || 0).toFixed(2)}`;
    }
    
    // Set up referral link if referral code exists
    if (stats.referralCode) {
      const link = `${window.location.origin}?inviteCode=${stats.referralCode}`;
      const referralLinkElem = document.getElementById('referralLink');
      if (referralLinkElem) {
        referralLinkElem.innerText = link;
      }
    }
    
    // Load withdrawal balance for the withdrawal section
    await loadWithdrawalBalance();
    
    console.log('✅ Dashboard loaded successfully');
    
  } catch (error) {
    console.error('❌ Error loading dashboard:', error);
    
    // Show user-friendly error message
    const authMsg = document.getElementById('authMsg');
    if (authMsg) {
      authMsg.style.color = 'red';
      authMsg.innerText = 'Failed to load dashboard data. Please try refreshing the page.';
    }
  }
}

// Enhanced auth check function
(async function checkAuth() {
  try {
    const token = TokenManager.get();
    
    // Remove loading indicator
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) {
      loadingDiv.remove();
      console.log('✅ Loading screen removed');
    }
    
    if (!token) {
      console.log('🔍 No token found, showing auth section...');
      showAuthSection();
      return;
    }
    
    console.log('🔍 Token found, verifying with server...');
    
    // Verify token with server
    const response = await fetchWithAuth('/api/auth/me');
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Token verified successfully:', data);
      
      if (data.isAdmin) {
        console.log('🔍 Admin user, redirecting to admin panel...');
        window.location.href = '/admin';
      } else {
        console.log('🔍 Regular user, showing dashboard...');
        showDashboard();
        await loadDashboard();
      }
    } else {
      console.log('❌ Token verification failed');
      TokenManager.remove();
      showAuthSection();
    }
  } catch (error) {
    console.error('❌ Auth check failed:', error);
    TokenManager.remove();
    showAuthSection();
  }
})();

// Cart - Global cart state
let cart = [];
let products = []; // Store products data for reference

// Load products and store them globally
async function loadProducts() {
  try {
    const res = await fetch('/api/products'); // Public endpoint, no auth needed
    products = await res.json();
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

// Enhanced addToCart function
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

// Remove item from cart
function removeFromCart(productId, price) {
  cart = cart.filter(item => !(item.productId === productId && item.price === price));
  renderCart();
}

// Update quantity
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

// Enhanced renderCart function
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

// Show cart animation when item is added
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

// Show cart notifications
function showCartNotification(message) {
  console.log('📢 Showing notification:', message);
  
  // Remove existing notification
  const existingNotification = document.querySelector('.cart-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement('div');
  notification.className = 'cart-notification';
  notification.innerHTML = message;
  
  // Enhanced styling
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
    font-size: 14px;
    max-width: 400px;
    text-align: center;
    animation: slideDown 0.5s ease-out, fadeOut 0.5s ease-in 2.5s forwards;
  `;

  // Handle error messages differently
  if (message.includes('❌')) {
    notification.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
    notification.style.boxShadow = '0 10px 30px rgba(239, 68, 68, 0.3)';
  } else if (message.includes('✅') || message.includes('🎉')) {
    notification.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    notification.style.boxShadow = '0 10px 30px rgba(16, 185, 129, 0.3)';
  }

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
  
  if (!checkoutBtn) {
    console.error('❌ Checkout button not found in DOM');
    return;
  }
  
  if (!cart || cart.length === 0) {
    showCartNotification('❌ Your cart is empty');
    return;
  }
  
  console.log('🛒 Starting checkout process...');
  console.log('🛒 Cart contents:', cart);
  
  const originalText = checkoutBtn.innerHTML;
  const originalDisabled = checkoutBtn.disabled;

  // Show loading state
  checkoutBtn.innerHTML = '<div class="loading-spinner">💎</div> Processing your gems...';
  checkoutBtn.disabled = true;
  checkoutBtn.style.opacity = '0.7';

  try {
    // Validate cart items
    const validatedCart = cart.filter(item => {
      if (!item.productId || !item.price || !item.quantity) {
        console.warn('⚠️ Invalid cart item:', item);
        return false;
      }
      return true;
    });

    if (validatedCart.length === 0) {
      throw new Error('No valid items in cart');
    }

    console.log('🔍 Sending checkout request...');
    
    // Make the API call
    const response = await fetchWithAuth('/api/cart/checkout', {
      method: 'POST',
      body: JSON.stringify({ items: validatedCart })
    });

    console.log('🔍 Checkout response status:', response.status);

    let data;
    try {
      data = await response.json();
      console.log('🔍 Checkout response data:', data);
    } catch (parseError) {
      console.error('❌ Failed to parse checkout response:', parseError);
      throw new Error('Invalid response from server');
    }

    if (response.ok) {
      // Success handling
      console.log('✅ Checkout successful!');
      
      checkoutBtn.innerHTML = '✅ Purchase Successful!';
      checkoutBtn.classList.add('success');
      checkoutBtn.style.background = '#10b981';
      checkoutBtn.style.color = 'white';
      
      showCartNotification('🎉 Please complete payment below');

      // Clear cart
      cart = [];
      renderCart();
      
      // Reload dashboard to update balances
      await loadDashboard();
      
      // Show payment section after a brief delay
      setTimeout(() => {
        showPaymentSection();
        
        // Reset checkout button
        checkoutBtn.innerHTML = originalText;
        checkoutBtn.classList.remove('success');
        checkoutBtn.disabled = originalDisabled;
        checkoutBtn.style.opacity = '1';
        checkoutBtn.style.background = '';
        checkoutBtn.style.color = '';
      }, 2000);

    } else {
      // Error handling
      console.error('❌ Checkout failed:', data);
      throw new Error(data.error || data.message || `Server error: ${response.status}`);
    }

  } catch (error) {
    console.error('❌ Checkout error:', error);
    
    // Show error state
    checkoutBtn.innerHTML = '❌ Purchase Failed';
    checkoutBtn.style.background = '#ef4444';
    checkoutBtn.style.color = 'white';
    
    showCartNotification('❌ ' + (error.message || 'Purchase failed. Please try again.'));

    // Reset button after delay
    setTimeout(() => {
      checkoutBtn.innerHTML = originalText;
      checkoutBtn.disabled = originalDisabled;
      checkoutBtn.style.opacity = '1';
      checkoutBtn.style.background = '';
      checkoutBtn.style.color = '';
    }, 3000);
  }
}

// Function to show payment section
function showPaymentSection() {
  try {
    console.log('🔍 Attempting to show payment section...');
    
    // Hide dashboard
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
      dashboard.classList.add('hidden');
      console.log('✅ Dashboard hidden');
    }
    
    // Show payment section
    const paymentSection = document.getElementById('paymentSection');
    if (paymentSection) {
      paymentSection.classList.remove('hidden');
      console.log('✅ Payment section shown');
      
      // Scroll to top of payment section
      paymentSection.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
      
      // Show success message in payment section
      showPaymentNotification('💎 Purchase confirmed! Please complete your payment using the details below.');
      
    } else {
      console.error('❌ Payment section not found in DOM');
      
      // Fallback: Create a simple payment notification
      showCartNotification('✅ Purchase successful! Please contact support to complete payment.');
    }
    
  } catch (error) {
    console.error('❌ Error showing payment section:', error);
    showCartNotification('✅ Purchase successful! Please contact support to complete payment.');
  }
}

function showPaymentNotification(message) {
  // Look for existing payment message area
  let paymentMsg = document.getElementById('paymentMsg');
  
  if (!paymentMsg) {
    // Create payment message area if it doesn't exist
    const paymentSection = document.getElementById('paymentSection');
    if (paymentSection) {
      paymentMsg = document.createElement('div');
      paymentMsg.id = 'paymentMsg';
      paymentMsg.style.cssText = `
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 1rem;
        border-radius: 8px;
        margin-bottom: 1rem;
        text-align: center;
        font-weight: 600;
      `;
      paymentSection.insertBefore(paymentMsg, paymentSection.firstChild);
    }
  }
  
  if (paymentMsg) {
    paymentMsg.innerHTML = message;
    paymentMsg.style.display = 'block';
  }
}

// Function to go back to dashboard from payment section
function backToDashboard() {
  try {
    const paymentSection = document.getElementById('paymentSection');
    const dashboard = document.getElementById('dashboard');
    
    if (paymentSection) {
      paymentSection.classList.add('hidden');
    }
    
    if (dashboard) {
      dashboard.classList.remove('hidden');
    }
    
    // Clear payment message
    const paymentMsg = document.getElementById('paymentMsg');
    if (paymentMsg) {
      paymentMsg.style.display = 'none';
    }
    
    console.log('✅ Returned to dashboard');
    
  } catch (error) {
    console.error('❌ Error returning to dashboard:', error);
  }
}

// Enhanced payment form handler
function setupPaymentForm() {
  const paymentForm = document.getElementById('paymentConfirmationForm');
  
  if (!paymentForm) {
    console.log('⚠️ Payment form not found');
    return;
  }
  
  // Remove existing event listeners
  const newPaymentForm = paymentForm.cloneNode(true);
  paymentForm.parentNode.replaceChild(newPaymentForm, paymentForm);
  
  // Add new event listener
  newPaymentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = newPaymentForm.querySelector('button[type="submit"]');
    const proofInput = document.getElementById('proof');
    
    if (!submitBtn) return;
    
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '⏳ Submitting...';
    submitBtn.disabled = true;
    
    try {
      // Prepare form data
      const formData = new FormData();
      
      if (proofInput && proofInput.files[0]) {
        formData.append('proof', proofInput.files[0]);
      }
      
      // Submit payment confirmation
      const response = await fetchWithAuth('/api/payments/confirm', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (response.ok) {
        showPaymentNotification('✅ Payment confirmation submitted successfully!');
        
        // Reset form
        newPaymentForm.reset();
        
        // Return to dashboard after delay
        setTimeout(() => {
          backToDashboard();
        }, 2000);
        
      } else {
        throw new Error(data.error || 'Failed to submit payment confirmation');
      }
      
    } catch (error) {
      console.error('❌ Payment confirmation error:', error);
      showPaymentNotification('❌ Failed to submit payment confirmation. Please try again.');
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
  
  console.log('✅ Payment form event listener attached');
}

// Add CSS for notifications
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
    const response = await fetchWithAuth('/api/withdrawals/balance');
    
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
    
    const res = await fetchWithAuth('/api/withdrawals', {
      method: 'POST',
      body: JSON.stringify({ amount, bankName, accountNumber })
    });
    
    console.log('🔍 Fetch response:', res.status, res.statusText);
    
    const data = await res.json();
    console.log('🔍 Response data:', data);

    if (res.ok) {
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
    const res = await fetchWithAuth('/api/referrals/stats');
    const data = await res.json();
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

// Copy referral link
function copyReferralLink() {
  const link = document.getElementById('referralLink').innerText;
  navigator.clipboard.writeText(link).then(() => {
    alert('Referral link copied to clipboard!');
  });
}
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
  try {
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
    await checkAuth();
    
  } catch (error) {
    console.error('DOMContentLoaded initialization error:', error);
    
    // Remove loading indicator on error
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) loadingDiv.remove();
    
    // Show auth section as fallback
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
  }
});

// Handle switching views - Add error handling
document.getElementById('showRegisterBtn').addEventListener('click', () => {
  try {
    document.getElementById('registerForm').classList.remove('hidden');
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('authMsg').innerText = '';
  } catch (error) {
    console.error('Error showing register form:', error);
  }
});

document.getElementById('showLoginBtn').addEventListener('click', () => {
  try {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('authMsg').innerText = '';
  } catch (error) {
    console.error('Error showing login form:', error);
  }
});

// Enhanced Login Function with better error handling
document.getElementById('loginBtn').addEventListener('click', async () => {
  const phone = document.getElementById('logPhone').value.trim();
  const password = document.getElementById('logPass').value;
  const authMsg = document.getElementById('authMsg');

  console.log('🔍 Login attempt for phone:', phone);

  // Reset auth message
  authMsg.innerText = '';

  // Basic validation
  if (!phone || !password) {
    authMsg.innerText = 'Please enter both phone number and password';
    return;
  }

  try {
    console.log('📡 Sending login request...');
    
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ phone, password })
    });

    console.log('📡 Login response status:', response.status);
    console.log('📡 Login response headers:', [...response.headers.entries()]);

    const data = await response.json();
    console.log('📡 Login response data:', data);
    
    if (response.ok && data.token) {
      // Use authManager to store token consistently
      window.authManager.storeAuthData(data.token, data.user);
      console.log('✅ Login successful, token saved');
      
      if (data.user && data.user.isAdmin) {
        console.log('🔧 Redirecting to admin dashboard');
        window.location.href = '/admin';
      } else {
        console.log('👤 Loading user dashboard');
        showDashboard();
        await loadDashboard();
      }
    } else {
      const errorMessage = data.error || data.message || 'Login failed';
      console.error('❌ Login failed:', errorMessage);
      authMsg.innerText = errorMessage;
    }
  } catch (error) {
    console.error('💥 Login error:', error);
    authMsg.innerText = 'Network error. Please check your connection and try again.';
  }
});

// Enhanced Register function with better error handling
document.getElementById('registerBtn').addEventListener('click', async () => {
  const phone = document.getElementById('regPhone').value.trim();
  const password = document.getElementById('regPass').value;
  const referralCode = document.getElementById('regRef').value.trim();
  const authMsg = document.getElementById('authMsg');

  console.log('🔍 Registration attempt for phone:', phone);
  console.log('🔍 Referral code:', referralCode || 'None');

  // Reset auth message
  authMsg.innerText = '';

  // Basic validation
  if (!phone || !password) {
    authMsg.innerText = 'Please enter both phone number and password';
    return;
  }

  if (password.length < 6) {
    authMsg.innerText = 'Password must be at least 6 characters long';
    return;
  }

  try {
    console.log('📡 Sending registration request...');
    
    const requestBody = { phone, password };
    if (referralCode) {
      requestBody.referralCode = referralCode;
    }

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📡 Registration response status:', response.status);
    console.log('📡 Registration response headers:', [...response.headers.entries()]);

    const data = await response.json();
    console.log('📡 Registration response data:', data);
    
    if (response.ok && data.token) {
      // Use authManager to store token consistently
      window.authManager.storeAuthData(data.token, data.user);
      console.log('✅ Registration successful, token saved');
      
      if (data.user && data.user.isAdmin) {
        console.log('🔧 Redirecting to admin dashboard');
        window.location.href = '/admin';
      } else {
        console.log('👤 Loading user dashboard');
        showDashboard();
        await loadDashboard();
      }
    } else {
      const errorMessage = data.error || data.message || 'Registration failed';
      console.error('❌ Registration failed:', errorMessage);
      authMsg.innerText = errorMessage;
    }
  } catch (error) {
    console.error('💥 Registration error:', error);
    authMsg.innerText = 'Network error. Please check your connection and try again.';
  }
});

// Enhanced Logout with better error handling
document.getElementById('logoutBtn').addEventListener('click', async () => {
  console.log('🔍 Logout initiated');
  
  try {
    // Call logout endpoint with JWT token
    const response = await window.authenticatedFetch('/api/auth/logout', { method: 'POST' });
    console.log('📡 Logout response status:', response.status);
    
    if (response.ok) {
      console.log('✅ Server logout successful');
    } else {
      console.warn('⚠️ Server logout failed, but continuing with client cleanup');
    }
  } catch (error) {
    console.error('💥 Logout API error:', error);
    // Continue with client cleanup even if server logout fails
  } finally {
    // Clear local auth data regardless of API response
    window.authManager.clearAuthData();
    console.log('🧹 Local auth data cleared');
    window.location.reload();
  }
});

// Show dashboard
function showDashboard() {
  try {
    document.getElementById('authSection').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');
    document.getElementById('showRegisterBtn').classList.add('hidden');
    document.getElementById('showLoginBtn').classList.add('hidden');
    document.getElementById('logoutBtn').classList.remove('hidden');

    // Remove loading indicator if it exists
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) loadingDiv.remove();

    loadProducts();
    loadReferrals();
  } catch (error) {
    console.error('Error showing dashboard:', error);
  }
}

// Enhanced Load dashboard with better error handling
async function loadDashboard() {
  try {
    console.log('📡 Loading dashboard data...');

    // Fetch stats with better error handling
    const statsResponse = await window.authenticatedFetch('/api/referrals/stats');
    console.log('📊 Stats response status:', statsResponse.status);

    if (!statsResponse.ok) {
      throw new Error(`Stats API returned ${statsResponse.status}: ${statsResponse.statusText}`);
    }

    const stats = await statsResponse.json();
    console.log('📊 Stats data:', stats);
    
    // Fetch balance data with better error handling
    const balanceResponse = await window.authenticatedFetch('/api/withdrawals/balance');
    console.log('💰 Balance response status:', balanceResponse.status);

    if (!balanceResponse.ok) {
      throw new Error(`Balance API returned ${balanceResponse.status}: ${balanceResponse.statusText}`);
    }

    const balance = await balanceResponse.json();
    console.log('💰 Balance data:', balance);
    
    // Update dashboard elements with null checks
    const totalPurchasesElem = document.getElementById('totalPurchases');
    const referralCodeElem = document.getElementById('referralCode');
    const commissionEarnedElem = document.getElementById('commissionEarned');
    const totalElem = document.getElementById('total');

    if (totalPurchasesElem) {
      totalPurchasesElem.innerText = stats.totalPurchases || 0;
    }

    if (referralCodeElem) {
      referralCodeElem.innerText = stats.referralCode || '-';
    }

    if (commissionEarnedElem) {
      commissionEarnedElem.innerText = `R${(stats.totalCommission || 0).toFixed(2)}`;
    }

    if (totalElem) {
      totalElem.innerText = `R${(balance.balance || 0).toFixed(2)}`;
    }
    
    // Update referral link
    if (stats.referralCode) {
      const link = `${window.location.origin}?inviteCode=${stats.referralCode}`;
      const referralLinkElem = document.getElementById('referralLink');
      if (referralLinkElem) {
        referralLinkElem.innerText = link;
      }
    }

    console.log('✅ Dashboard loaded successfully');
    
  } catch (error) {
    console.error('💥 Error loading dashboard:', error);
    
    // Show user-friendly error message
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      color: #e53e3e;
      background: #fed7d7;
      padding: 1rem;
      border-radius: 8px;
      margin: 1rem;
      text-align: center;
    `;
    errorDiv.innerText = 'Unable to load dashboard data. Please refresh the page.';
    
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
      dashboard.insertBefore(errorDiv, dashboard.firstChild);
    }
  }
}

// Enhanced Authentication check with better error handling
async function checkAuth() {
  try {
    console.log('🔍 Checking authentication...');
    
    // Check if we have a token
    if (!window.authManager.isAuthenticated()) {
      console.log('❌ No valid token found');
      
      // Remove loading indicator
      const loadingDiv = document.getElementById('loading');
      if (loadingDiv) loadingDiv.remove();
      
      // Not logged in - show auth section
      document.getElementById('authSection').classList.remove('hidden');
      document.getElementById('dashboard').classList.add('hidden');
      return;
    }

    console.log('✅ Token found, verifying with server...');

    // Verify token with server
    const response = await window.authenticatedFetch('/api/auth/me');
    
    console.log('📡 Auth verification response status:', response.status);
    
    // Remove loading indicator
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) loadingDiv.remove();
    
    if (response.ok) {
      const data = await response.json();
      console.log('📡 Auth verification data:', data);
      
      if (data.isAdmin) {
        console.log('🔧 Admin user detected, redirecting...');
        window.location.href = '/admin';
      } else {
        console.log('👤 Regular user, showing dashboard...');
        showDashboard();
        await loadDashboard();
      }
    } else {
      console.warn('⚠️ Token verification failed');
      
      // Token invalid - clear auth data and show auth section
      window.authManager.clearAuthData();
      document.getElementById('authSection').classList.remove('hidden');
      document.getElementById('dashboard').classList.add('hidden');
    }
  } catch (error) {
    console.error('💥 Auth check failed:', error);
    
    // Clear auth data on error
    window.authManager.clearAuthData();
    
    // Remove loading indicator and show auth section on error
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) loadingDiv.remove();
    
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
  }
}

// Cart - All functions with enhanced error handling
// Global cart state
let cart = [];
let products = []; // Store products data for reference

// Enhanced Load products with error handling
async function loadProducts() {
  try {
    console.log('📡 Loading products...');
    
    const response = await window.authenticatedFetch('/api/products');
    console.log('📡 Products response status:', response.status);

    if (!response.ok) {
      throw new Error(`Products API returned ${response.status}: ${response.statusText}`);
    }

    products = await response.json();
    console.log('📦 Products loaded:', products.length);

    const list = document.getElementById('productList');
    if (!list) {
      console.error('❌ Product list element not found');
      return;
    }

    list.innerHTML = '';

    if (!products || products.length === 0) {
      list.innerHTML = '<div style="text-align: center; padding: 2rem;">No products available</div>';
      return;
    }

    products.forEach(p => {
      const options = (p.id % 2 === 0)
        ? [300, 500, 1000, 3800, 6000]
        : [100, 250, 500, 700, 1000, 2500];

      const div = document.createElement('div');
      div.className = 'product-card';

      div.innerHTML = `
        <img src="${p.imageUrl}" alt="${p.name}" class="product-image" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2Y3ZmFmYyIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSIjNjg4MDk3IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+'">
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

    console.log('✅ Products rendered successfully');
    
  } catch (error) {
    console.error('💥 Error loading products:', error);
    
    const list = document.getElementById('productList');
    if (list) {
      list.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: #e53e3e;">
          <div>Unable to load products</div>
          <button onclick="loadProducts()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #3182ce; color: white; border: none; border-radius: 4px; cursor: pointer;">
            Retry
          </button>
        </div>
      `;
    }
  }
}

// Enhanced addToCart function
function addToCart(productId, price, name, type) {
  try {
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
    console.log('🛒 Item added to cart:', { productId, price, name });
    
  } catch (error) {
    console.error('💥 Error adding to cart:', error);
    showCartNotification('❌ Failed to add item to cart');
  }
}

// Remove item from cart
function removeFromCart(productId, price) {
  try {
    cart = cart.filter(item => !(item.productId === productId && item.price === price));
    renderCart();
    console.log('🛒 Item removed from cart:', { productId, price });
  } catch (error) {
    console.error('💥 Error removing from cart:', error);
  }
}

// Update quantity
function updateQuantity(productId, price, change) {
  try {
    const item = cart.find(item => item.productId === productId && item.price === price);
    if (item) {
      item.quantity += change;
      if (item.quantity <= 0) {
        removeFromCart(productId, price);
      } else {
        renderCart();
      }
      console.log('🛒 Cart quantity updated:', { productId, price, quantity: item.quantity });
    }
  } catch (error) {
    console.error('💥 Error updating quantity:', error);
  }
}

// Enhanced renderCart function
function renderCart() {
  try {
    const cartDiv = document.getElementById('cart');
    const checkoutBtn = document.getElementById('checkoutBtn');
    
    if (!cartDiv) {
      console.error('❌ Cart element not found');
      return;
    }
    
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
      
      if (checkoutBtn) {
        checkoutBtn.disabled = true;
        checkoutBtn.style.opacity = '0.6';
      }
      return;
    }

    cartDiv.classList.add('has-items');
    
    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.style.opacity = '1';
    }

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
    
  } catch (error) {
    console.error('💥 Error rendering cart:', error);
  }
}

// Show cart animation
function showCartAnimation() {
  try {
    const cartDiv = document.getElementById('cart');
    
    if (!cartDiv) return;
    
    // Add a brief highlight effect
    cartDiv.style.transform = 'scale(1.02)';
    cartDiv.style.transition = 'transform 0.2s ease';
    
    setTimeout(() => {
      cartDiv.style.transform = 'scale(1)';
    }, 200);

    // Show a subtle notification
    showCartNotification('💎 Gem added to your collection!');
  } catch (error) {
    console.error('💥 Error in cart animation:', error);
  }
}

// Show cart notifications
function showCartNotification(message) {
  try {
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
    
  } catch (error) {
    console.error('💥 Error showing notification:', error);
  }
}

// Enhanced checkout function
async function checkout() {
  const checkoutBtn = document.getElementById('checkoutBtn');
  if (!checkoutBtn) return;
  
  const originalText = checkoutBtn.innerHTML;

  try {
    checkoutBtn.innerHTML = '<div class="cart-loading">Processing your gems...</div>';
    checkoutBtn.disabled = true;

    console.log('🛒 Processing checkout with items:', cart);

    const response = await window.authenticatedFetch('/api/cart/checkout', {
      method: 'POST',
      body: JSON.stringify({ items: cart })
    });

    console.log('📡 Checkout response status:', response.status);

    const data = await response.json();
    console.log('📡 Checkout response data:', data);

    if (response.ok) {
      checkoutBtn.innerHTML = '✅ Purchase Successful!';
      checkoutBtn.classList.add('cart-success');
      showCartNotification('🎉 Purchase completed successfully!');

      cart = [];
      renderCart();
      await loadDashboard();

      setTimeout(() => {
        // Reset checkout button
        checkoutBtn.innerHTML = originalText;
        checkoutBtn.classList.remove('cart-success');
        checkoutBtn.disabled = false;

        // Show payment section if it exists
        const paymentSection = document.getElementById('paymentSection');
        if (paymentSection) {
          document.getElementById('dashboard').classList.add('hidden');
          paymentSection.classList.remove('hidden');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 2000);
    } else {
      throw new Error(data.error || data.message || 'Checkout failed');
    }

  } catch (error) {
    console.error('💥 Checkout error:', error);
    
    checkoutBtn.innerHTML = '❌ Purchase Failed';
    showCartNotification('❌ ' + error.message);

    setTimeout(() => {
      checkoutBtn.innerHTML = originalText;
      checkoutBtn.disabled = false;
    }, 3000);
  }
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

// Enhanced Load withdrawal balance
async function loadWithdrawalBalance() {
  try {
    console.log('💰 Loading withdrawal balance...');
    
    const response = await window.authenticatedFetch('/api/withdrawals/balance');
    console.log('💰 Balance response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Balance API returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('💰 Balance data:', data);
    
    const balanceElem = document.getElementById('withdrawBalance');
    if (balanceElem) {
      balanceElem.innerText = `R${data.balance.toFixed(2)}`;
    }

    const withdrawAmountInput = document.getElementById('withdrawAmount');
    if (withdrawAmountInput) {
      withdrawAmountInput.max = data.balance.toFixed(2);
      withdrawAmountInput.value = ''; // reset on load
    }

    console.log('✅ Withdrawal balance loaded successfully');
    
  } catch (error) {
    console.error('💥 Load withdrawal balance error:', error);
    
    const balanceElem = document.getElementById('withdrawBalance');
    if (balanceElem) {
      balanceElem.innerText = 'Error loading balance';
    }
  }
}

// Enhanced Withdrawal form
const withdrawForm = document.getElementById('withdrawForm');
if (withdrawForm) {
  withdrawForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('💰 Withdrawal form submitted');

    const amountInput = document.getElementById('withdrawAmount');
    const bankInput = document.getElementById('withdrawBank');
    const accountInput = document.getElementById('withdrawAccount');
    const msgElem = document.getElementById('withdrawMsg');

    if (!amountInput || !bankInput || !accountInput || !msgElem) {
      console.error('❌ Withdrawal form elements not found');
      return; // Exit early if elements are missing
    }

    // Get values from inputs
    const amount = parseFloat(amountInput.value);
    const bankName = bankInput.value.trim();
    const accountNumber = accountInput.value.trim();

    // Clear previous messages
    msgElem.innerText = '';
    msgElem.style.color = 'red';

    // Validate inputs
    if (!amount || amount <= 0) {
      msgElem.innerText = 'Please enter a valid withdrawal amount.';
      return;
    }

    if (!bankName) {
      msgElem.innerText = 'Please enter your bank name.';
      return;
    }

    if (!accountNumber) {
      msgElem.innerText = 'Please enter your account number.';
      return;
    }

    // Validate amount <= max allowed
    const maxAmount = parseFloat(amountInput.max);
    if (maxAmount && amount > maxAmount) {
      msgElem.innerText = `You can withdraw up to R${maxAmount.toFixed(2)} only.`;
      return;
    }

    try {
      console.log('🔍 About to send fetch request');
      
      const response = await window.authenticatedFetch('/api/withdrawals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          amount, 
          bankName, 
          accountNumber 
        })
      });
      
      console.log('🔍 Fetch response:', response.status, response.statusText);
      
      const data = await response.json();
      console.log('🔍 Response data:', data);

      if (response.ok) {
        msgElem.style.color = 'green';
        msgElem.innerText = data.message || 'Withdrawal requested successfully!';
        
        // Clear form inputs
        amountInput.value = '';
        bankInput.value = '';
        accountInput.value = '';

        // Refresh balance to reflect new withdrawal
        if (typeof loadWithdrawalBalance === 'function') {
          await loadWithdrawalBalance();
        }
      } else {
        msgElem.innerText = data.error || 'Failed to request withdrawal.';
      }
    } catch (err) {
      console.error('🔍 Fetch error:', err);
      msgElem.innerText = 'Server error. Please try again later.';
    }
  });
}

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
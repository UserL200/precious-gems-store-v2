document.addEventListener('DOMContentLoaded', () => {
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

// Register
document.getElementById('registerBtn').addEventListener('click', async () => {
  const phone = document.getElementById('regPhone').value;
  const password = document.getElementById('regPass').value;
  const referralCode = document.getElementById('regRef').value;

  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password, referralCode })
  });

  const data = await res.json();
  if (res.ok) {
    if (data.isAdmin) {
      window.location.href = '/admin'; // Redirect to admin dashboard
    } else {
      showDashboard();
      loadDashboard();
      // loadProducts(); 
    }
  } else {
    document.getElementById('authMsg').innerText = data.error || 'Registration failed';
  }
});

// Login
document.getElementById('loginBtn').addEventListener('click', async () => {
  const phone = document.getElementById('logPhone').value;
  const password = document.getElementById('logPass').value;

  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password })
  });

  const data = await res.json();
  if (res.ok) {
    if (data.isAdmin) {
      window.location.href = '/admin';
    } else {
      showDashboard();
      loadDashboard();
    }
  } else {
    document.getElementById('authMsg').innerText = data.error || 'Login failed';
  }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.reload();
});

// Show dashboard
function showDashboard() {
  document.getElementById('authSection').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  document.getElementById('showRegisterBtn').classList.add('hidden');
  document.getElementById('showLoginBtn').classList.add('hidden');
  document.getElementById('logoutBtn').classList.remove('hidden');

  loadProducts();
  loadReferrals();
}
async function loadDashboard() {
  try {
    console.log('📡 Fetching /api/stats...');

    const statsResponse = await fetch('/api/referrals/stats');
    const stats = await statsResponse.json();

    console.log('📊 Stats response status:', statsResponse.status);
    console.log('📊 Stats response headers:', [...statsResponse.headers.entries()]);
    
    // Fetch balance data  
    const balanceResponse = await fetch('/api/withdrawals/balance');
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

// On page load
(async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    
    // Remove loading indicator
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) loadingDiv.remove();
    
    if (res.ok) {
      const data = await res.json();
      if (data.isAdmin) {
        window.location.href = '/admin';
      } else {
        showDashboard();
        loadDashboard();
      }
    } else {
      // Not logged in - show auth section
      document.getElementById('authSection').classList.remove('hidden');
      document.getElementById('dashboard').classList.add('hidden');
    }
  } catch (error) {
    console.error('Auth check failed:', error);
    // Remove loading indicator and show auth section on error
    const loadingDiv = document.getElementById('loading');
    if (loadingDiv) loadingDiv.remove();
    
    document.getElementById('authSection').classList.remove('hidden');
    document.getElementById('dashboard').classList.add('hidden');
  }
})();


// Cart
// Global cart state
let cart = [];
let products = []; // Store products data for reference

// Load products and store them globally
async function loadProducts() {
  const res = await fetch('/api/products');
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

// Enhanced checkout function
async function checkout() {
  const checkoutBtn = document.getElementById('checkoutBtn');
  const originalText = checkoutBtn.innerHTML;

  checkoutBtn.innerHTML = '<div class="cart-loading">Processing your gems...</div>';
  checkoutBtn.disabled = true;

  try {
    const res = await fetch('/api/cart/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart })
    });

    const data = await res.json();

    if (res.ok) {
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

async function loadWithdrawalBalance() {
  try {
    const response = await fetch('http://127.0.0.1:3000/api/withdrawals/balance');
    
    if (!response.ok) throw new Error('Failed to fetch balance');
    
    const data = await response.json(); // ✅ Read once
    console.log('Withdrawal response:........................', data); // ✅ Use the stored data
    
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

// document.getElementById('withdrawForm').addEventListener('submit', async (e) => {
//   e.preventDefault();

//   const amountInput = document.getElementById('withdrawAmount');
//   const bankInput = document.getElementById('withdrawBank');
//   const accountInput = document.getElementById('withdrawAccount');
//   const msgElem = document.getElementById('withdrawMsg');

//   const amount = parseFloat(amountInput.value);
//   const bankName = bankInput.value.trim();
//   const accountNumber = accountInput.value.trim();

//   msgElem.style.color = 'red';
//   msgElem.innerText = '';

//   if (!amount || amount <= 0) {
//     msgElem.innerText = 'Please enter a valid withdrawal amount.';
//     return;
//   }

//   if (!bankName || !accountNumber) {
//     msgElem.innerText = 'Please provide bank name and account number.';
//     return;
//   }

//   // Validate amount <= max allowed
//   const maxAmount = parseFloat(amountInput.max);
//   if (amount > maxAmount) {
//     msgElem.innerText = `You can withdraw up to R${maxAmount.toFixed(2)} only.`;
//     return;
//   }

//   try {
//     const res = await fetch('/api/withdrawals', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ amount, bankName, accountNumber }),
//     });
//     const data = await res.json();

//     if (res.ok) {
//       msgElem.style.color = 'green';
//       msgElem.innerText = data.message || 'Withdrawal requested successfully!';
//       amountInput.value = '';
//       bankInput.value = '';
//       accountInput.value = '';

//       // Refresh balance to reflect new withdrawal
//       await loadWithdrawalBalance();
//     } else {
//       msgElem.innerText = data.error || 'Failed to request withdrawal.';
//     }
//   } catch (err) {
//     msgElem.innerText = 'Server error. Please try again later.';
//   }
// });

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
    
    const res = await fetch('/api/withdrawals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, bankName, accountNumber }),
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
          await loadWithdrawalBalance();  } else {
      msgElem.innerText = data.error || 'Failed to request withdrawal.';}
           } catch (err) {
    console.error('🔍 Fetch error:', err);
    msgElem.innerText = 'Server error. Please try again later.';
  }
});

async function loadReferrals() {
  const res = await fetch('/api/referrals/stats');
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
}


function copyReferralLink() {
  const link = document.getElementById('referralLink').innerText;
  navigator.clipboard.writeText(link).then(() => {
    alert('Referral link copied to clipboard!');
  });
}
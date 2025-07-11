// Pagination state
const paginationState = {
  withdrawals: { currentPage: 1, itemsPerPage: 10, totalItems: 0 },
  purchases: { currentPage: 1, itemsPerPage: 10, totalItems: 0 },
  users: { currentPage: 1, itemsPerPage: 10, totalItems: 0 }
};

document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  const refreshBtn = document.getElementById('refreshWithdrawalsBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', () => loadWithdrawals(1));

  const refreshUsersBtn = document.getElementById('refreshUsersBtn');
  if (refreshUsersBtn) refreshUsersBtn.addEventListener('click', () => loadUsers(1));

  document.getElementById('refreshWithdrawalsBtn')?.addEventListener('click', () => loadWithdrawals(1));
  document.getElementById('refreshPurchasesBtn')?.addEventListener('click', () => loadPendingPurchases(1));

  // Set up event delegation for dynamic content
  setupEventDelegation();

  // Load initial data
  loadWithdrawals(1);
  loadUsers(1);
  loadPendingPurchases(1);
});

function setupEventDelegation() {
  // Event delegation for all dynamic buttons
  document.addEventListener('click', (e) => {
    const target = e.target;
    
    // Pagination buttons
    if (target.classList.contains('pagination-btn')) {
      e.preventDefault();
      const type = target.dataset.type;
      const page = parseInt(target.dataset.page);
      changePage(type, page);
    }
    
    // Withdrawal action buttons
    if (target.classList.contains('withdrawal-action-btn')) {
      e.preventDefault();
      const id = target.dataset.withdrawalId;
      const status = target.dataset.status;
      if (id && status) processWithdrawal(id, status);
    }
    
    // Purchase action buttons
    if (target.classList.contains('purchase-action-btn')) {
      e.preventDefault();
      const id = target.dataset.purchaseId;
      const status = target.dataset.status;
      if (id && status) processPurchase(id, status);
    }
    
    // User action buttons
    if (target.classList.contains('user-role-btn')) {
      e.preventDefault();
      const id = target.dataset.userId;
      const isAdmin = target.dataset.isAdmin === 'true';
      if (id) updateRole(id, isAdmin);
    }
    
    if (target.classList.contains('user-delete-btn')) {
      e.preventDefault();
      const id = target.dataset.userId;
      if (id) deleteUser(id);
    }
    
    // Retry buttons
    if (target.classList.contains('retry-btn')) {
      e.preventDefault();
      const type = target.dataset.type;
      switch(type) {
        case 'withdrawals':
          loadWithdrawals(1);
          break;
        case 'purchases':
          loadPendingPurchases(1);
          break;
        case 'users':
          loadUsers(1);
          break;
      }
    }
  });
  
  // Event delegation for select dropdowns
  document.addEventListener('change', (e) => {
    if (e.target.classList.contains('items-per-page-select')) {
      const type = e.target.dataset.type;
      const itemsPerPage = parseInt(e.target.value);
      changeItemsPerPage(type, itemsPerPage);
    }
  });
}

async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    location.reload();
  } catch (error) {
    console.error('Logout error:', error);
    location.reload();
  }
}

function createPaginationControls(type, currentPage, totalPages, totalItems) {
  const startItem = (currentPage - 1) * paginationState[type].itemsPerPage + 1;
  const endItem = Math.min(currentPage * paginationState[type].itemsPerPage, totalItems);
  
  return `
    <div class="pagination-controls" style="display: flex; justify-content: space-between; align-items: center; margin: 1rem 0; padding: 1rem; background: #f5f5f5; border-radius: 4px;">
      <div class="pagination-info">
        <span>Showing ${startItem}-${endItem} of ${totalItems} items</span>
        <select class="items-per-page-select" data-type="${type}" style="margin-left: 1rem; padding: 0.25rem;">
          <option value="5" ${paginationState[type].itemsPerPage === 5 ? 'selected' : ''}>5 per page</option>
          <option value="10" ${paginationState[type].itemsPerPage === 10 ? 'selected' : ''}>10 per page</option>
          <option value="25" ${paginationState[type].itemsPerPage === 25 ? 'selected' : ''}>25 per page</option>
          <option value="50" ${paginationState[type].itemsPerPage === 50 ? 'selected' : ''}>50 per page</option>
        </select>
      </div>
      <div class="pagination-buttons">
        <button class="btn btn-secondary pagination-btn" data-type="${type}" data-page="1" ${currentPage === 1 ? 'disabled' : ''}>First</button>
        <button class="btn btn-secondary pagination-btn" data-type="${type}" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>Previous</button>
        <span style="margin: 0 1rem;">Page ${currentPage} of ${totalPages}</span>
        <button class="btn btn-secondary pagination-btn" data-type="${type}" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Next</button>
        <button class="btn btn-secondary pagination-btn" data-type="${type}" data-page="${totalPages}" ${currentPage === totalPages ? 'disabled' : ''}>Last</button>
      </div>
    </div>
  `;
}

function changePage(type, page) {
  switch(type) {
    case 'withdrawals':
      loadWithdrawals(page);
      break;
    case 'purchases':
      loadPendingPurchases(page);
      break;
    case 'users':
      loadUsers(page);
      break;
  }
}

function changeItemsPerPage(type, itemsPerPage) {
  paginationState[type].itemsPerPage = itemsPerPage;
  paginationState[type].currentPage = 1;
  changePage(type, 1);
}

async function loadWithdrawals(page = 1) {
  const container = document.getElementById('withdrawals');
  if (!container) return;

  try {
    paginationState.withdrawals.currentPage = page;
    container.innerHTML = '<div class="loading">Loading withdrawals...</div>';

    const res = await fetch('/api/admin/withdrawals', { credentials: 'include' });  
    
    if (!res.ok) {
      if (res.status === 403) {
        throw new Error('Access denied. Admin privileges required.');
      } else if (res.status === 401) {
        throw new Error('Authentication required. Please log in.');
      } else {
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }
    }

    const responseData = await res.json();
    
    // Handle the new response format with withdrawals array and summary
    let allData;
    if (Array.isArray(responseData)) {
      // Backward compatibility - if it's still an array
      allData = responseData;
    } else if (responseData.withdrawals && Array.isArray(responseData.withdrawals)) {
      // New format with withdrawals property
      allData = responseData.withdrawals;
    } else {
      throw new Error('Invalid data format received from server');
    }

    // Pagination logic
    const itemsPerPage = paginationState.withdrawals.itemsPerPage;
    const totalItems = allData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = allData.slice(startIndex, endIndex);

    paginationState.withdrawals.totalItems = totalItems;

    if (totalItems === 0) {
      container.innerHTML = '<div class="no-data">No withdrawals found</div>';
      return;
    }

    const tableHTML = `
      ${createPaginationControls('withdrawals', page, totalPages, totalItems)}
      <div class="table-container" style="overflow-x: auto; border: 1px solid #ddd; border-radius: 4px;">
        <table style="width: 100%; border-collapse: collapse; background: white;">
          <thead style="background: #f8f9fa;">
            <tr>
              <th style="padding: 1rem; text-align: left; border-bottom: 2px solid #dee2e6;">User Phone</th>
              <th style="padding: 1rem; text-align: left; border-bottom: 2px solid #dee2e6;">Amount</th>
              <th style="padding: 1rem; text-align: left; border-bottom: 2px solid #dee2e6;">Bank</th>
              <th style="padding: 1rem; text-align: left; border-bottom: 2px solid #dee2e6;">Account Number</th>
              <th style="padding: 1rem; text-align: left; border-bottom: 2px solid #dee2e6;">Status</th>
              <th style="padding: 1rem; text-align: center; border-bottom: 2px solid #dee2e6;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${paginatedData.map(w => `
              <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 1rem;">${w.user?.phone || w.User?.phone || 'N/A'}</td>
                <td style="padding: 1rem; color: #28a745; font-weight: bold;">R${w.amount || 0}</td>
                <td style="padding: 1rem;">${w.bankName || 'N/A'}</td>
                <td style="padding: 1rem;">${w.accountNumber || 'N/A'}</td>
                <td style="padding: 1rem;">
                  <span class="status-badge status-${w.status}" style="padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.875rem; font-weight: 500;">
                    ${w.status || 'pending'}
                  </span>
                </td>
                <td style="padding: 1rem; text-align: center;">
                  ${w.status === 'pending' ? `
                    <button class="btn btn-success withdrawal-action-btn" data-withdrawal-id="${w.id}" data-status="approved" style="margin-right: 0.5rem;">Approve</button>
                    <button class="btn btn-danger withdrawal-action-btn" data-withdrawal-id="${w.id}" data-status="declined">Decline</button>
                  ` : `
                    <span style="color: #6c757d; font-style: italic;">Processed</span>
                  `}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${createPaginationControls('withdrawals', page, totalPages, totalItems)}
    `;

    container.innerHTML = tableHTML;

  } catch (error) {
    console.error('Error loading withdrawals:', error);
    container.innerHTML = `
      <div class="error-message" style="color: red; padding: 1rem; border: 1px solid red; border-radius: 4px; margin: 1rem 0;">
        <h4>Error Loading Withdrawals</h4>
        <p>${error.message}</p>
        <button class="btn btn-primary retry-btn" data-type="withdrawals">Retry</button>
      </div>
    `;
  }
}

async function processWithdrawal(id, status) {
  if (!id) {
    console.error('No withdrawal ID provided');
    return;
  }

  try {
    const res = await fetch('/api/withdrawals/admin/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ withdrawalId: id, status })
    });

    if (!res.ok) {
      throw new Error(`Failed to process withdrawal: ${res.status} ${res.statusText}`);
    }

    await loadWithdrawals(paginationState.withdrawals.currentPage);
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    alert(`Error processing withdrawal: ${error.message}`);
  }
}

async function loadPendingPurchases(page = 1) {
  const container = document.getElementById('pendingPurchases');
  if (!container) return;

  try {
    paginationState.purchases.currentPage = page;
    container.innerHTML = '<div class="loading">Loading pending purchases...</div>';

    const res = await fetch('/api/admin/purchases/pending', { credentials: 'include' });
    
    if (!res.ok) {
      if (res.status === 403) {
        throw new Error('Access denied. Admin privileges required.');
      } else if (res.status === 401) {
        throw new Error('Authentication required. Please log in.');
      } else {
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }
    }

    const allData = await res.json();
    
    if (!Array.isArray(allData)) {
      throw new Error('Invalid data format received from server');
    }

    // Pagination logic
    const itemsPerPage = paginationState.purchases.itemsPerPage;
    const totalItems = allData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = allData.slice(startIndex, endIndex);

    paginationState.purchases.totalItems = totalItems;

    if (totalItems === 0) {
      container.innerHTML = '<div class="no-data">No pending purchases found</div>';
      return;
    }

    const tableHTML = `
      ${createPaginationControls('purchases', page, totalPages, totalItems)}
      <div class="table-container" style="overflow-x: auto; border: 1px solid #ddd; border-radius: 4px;">
        <table style="width: 100%; border-collapse: collapse; background: white;">
          <thead style="background: #f8f9fa;">
            <tr>
              <th style="padding: 1rem; text-align: left; border-bottom: 2px solid #dee2e6;">User Phone</th>
              <th style="padding: 1rem; text-align: left; border-bottom: 2px solid #dee2e6;">Amount</th>
              <th style="padding: 1rem; text-align: left; border-bottom: 2px solid #dee2e6;">Date</th>
              <th style="padding: 1rem; text-align: left; border-bottom: 2px solid #dee2e6;">Status</th>
              <th style="padding: 1rem; text-align: center; border-bottom: 2px solid #dee2e6;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${paginatedData.map(p => `
              <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 1rem;">${p.User?.phone || 'N/A'}</td>
                <td style="padding: 1rem; color: #28a745; font-weight: bold;">R${p.totalAmount || 0}</td>
                <td style="padding: 1rem;">${p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A'}</td>
                <td style="padding: 1rem;">
                  <span class="status-badge status-${p.status}" style="padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.875rem; font-weight: 500;">
                    ${p.status || 'pending'}
                  </span>
                </td>
                <td style="padding: 1rem; text-align: center;">
                  ${p.status === 'pending' ? `
                    <button class="btn btn-success purchase-action-btn" data-purchase-id="${p.id}" data-status="approved" style="margin-right: 0.5rem;">Approve</button>
                    <button class="btn btn-danger purchase-action-btn" data-purchase-id="${p.id}" data-status="declined">Decline</button>
                  ` : `
                    <span style="color: #6c757d; font-style: italic;">Processed</span>
                  `}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${createPaginationControls('purchases', page, totalPages, totalItems)}
    `;

    container.innerHTML = tableHTML;

  } catch (error) {
    console.error('Error loading pending purchases:', error);
    container.innerHTML = `
      <div class="error-message" style="color: red; padding: 1rem; border: 1px solid red; border-radius: 4px; margin: 1rem 0;">
        <h4>Error Loading Pending Purchases</h4>
        <p>${error.message}</p>
        <button class="btn btn-primary retry-btn" data-type="purchases">Retry</button>
      </div>
    `;
  }
}

async function processPurchase(id, status) {
  if (!id) {
    console.error('No purchase ID provided');
    return;
  }

  try {
    const res = await fetch(`/api/admin/purchases/${id}/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status })
    });

    if (!res.ok) {
      throw new Error(`Failed to process purchase: ${res.status} ${res.statusText}`);
    }

    await loadPendingPurchases(paginationState.purchases.currentPage);
  } catch (error) {
    console.error('Error processing purchase:', error);
    alert(`Error processing purchase: ${error.message}`);
  }
}

async function loadUsers(page = 1) {
  const container = document.getElementById('usersList');
  if (!container) return;

  try {
    paginationState.users.currentPage = page;
    container.innerHTML = '<div class="loading">Loading users...</div>';

    const res = await fetch('/api/admin/users', { credentials: 'include' });
    
    if (!res.ok) {
      if (res.status === 403) {
        throw new Error('Access denied. Admin privileges required.');
      } else if (res.status === 401) {
        throw new Error('Authentication required. Please log in.');
      } else {
        throw new Error(`Server error: ${res.status} ${res.statusText}`);
      }
    }

    const allData = await res.json();
    
    if (!Array.isArray(allData)) {
      throw new Error('Invalid data format received from server');
    }

    // Pagination logic
    const itemsPerPage = paginationState.users.itemsPerPage;
    const totalItems = allData.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = allData.slice(startIndex, endIndex);

    paginationState.users.totalItems = totalItems;

    if (totalItems === 0) {
      container.innerHTML = '<div class="no-data">No users found</div>';
      return;
    }

    const tableHTML = `
      ${createPaginationControls('users', page, totalPages, totalItems)}
      <div class="table-container" style="overflow-x: auto; border: 1px solid #ddd; border-radius: 4px;">
        <table style="width: 100%; border-collapse: collapse; background: white;">
          <thead style="background: #f8f9fa;">
            <tr>
              <th style="padding: 1rem; text-align: left; border-bottom: 2px solid #dee2e6;">Phone</th>
              <th style="padding: 1rem; text-align: left; border-bottom: 2px solid #dee2e6;">Referral Code</th>
              <th style="padding: 1rem; text-align: left; border-bottom: 2px solid #dee2e6;">Total Received</th>
              <th style="padding: 1rem; text-align: left; border-bottom: 2px solid #dee2e6;">Role</th>
              <th style="padding: 1rem; text-align: center; border-bottom: 2px solid #dee2e6;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${paginatedData.map(u => `
              <tr style="border-bottom: 1px solid #dee2e6;">
                <td style="padding: 1rem;">${u.phone || 'N/A'}</td>
                <td style="padding: 1rem; font-family: monospace; background: #f8f9fa; border-radius: 4px; display: inline-block; padding: 0.25rem 0.5rem;">${u.referralCode || 'N/A'}</td>
                <td style="padding: 1rem; color: #28a745; font-weight: bold;">R${u.totalReceived || 0}</td>
                <td style="padding: 1rem;">
                  <span class="role-badge ${u.isAdmin ? 'admin' : 'user'}" style="padding: 0.25rem 0.5rem; border-radius: 12px; font-size: 0.875rem; font-weight: 500; background: ${u.isAdmin ? '#dc3545' : '#28a745'}; color: white;">
                    ${u.isAdmin ? 'Admin' : 'User'}
                  </span>
                </td>
                <td style="padding: 1rem; text-align: center;">
                  <button class="btn btn-warning user-role-btn" data-user-id="${u.id}" data-is-admin="${!u.isAdmin}" style="margin-right: 0.5rem;">
                    Make ${u.isAdmin ? 'User' : 'Admin'}
                  </button>
                  <button class="btn btn-danger user-delete-btn" data-user-id="${u.id}">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ${createPaginationControls('users', page, totalPages, totalItems)}
    `;

    container.innerHTML = tableHTML;

  } catch (error) {
    console.error('Error loading users:', error);
    container.innerHTML = `
      <div class="error-message" style="color: red; padding: 1rem; border: 1px solid red; border-radius: 4px; margin: 1rem 0;">
        <h4>Error Loading Users</h4>
        <p>${error.message}</p>
        <button class="btn btn-primary retry-btn" data-type="users">Retry</button>
      </div>
    `;
  }
}

async function updateRole(userId, isAdmin) {
  if (!userId) {
    console.error('No user ID provided');
    return;
  }

  try {
    const res = await fetch('/api/admin/users/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ userId, isAdmin })
    });

    if (!res.ok) {
      throw new Error(`Failed to update user role: ${res.status} ${res.statusText}`);
    }

    await loadUsers(paginationState.users.currentPage);
  } catch (error) {
    console.error('Error updating user role:', error);
    alert(`Error updating user role: ${error.message}`);
  }
}

async function deleteUser(userId) {
  if (!userId) {
    console.error('No user ID provided');
    return;
  }

  if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
    return;
  }

  try {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!res.ok) {
      throw new Error(`Failed to delete user: ${res.status} ${res.statusText}`);
    }

    await loadUsers(paginationState.users.currentPage);
  } catch (error) {
    console.error('Error deleting user:', error);
    alert(`Error deleting user: ${error.message}`);
  }
}

// Add CSS for status badges and styling
const style = document.createElement('style');
style.textContent = `
  .status-pending { background-color: #ffc107; color: #000; }
  .status-approved { background-color: #28a745; color: white; }
  .status-declined { background-color: #dc3545; color: white; }
  .btn { padding: 0.375rem 0.75rem; border: none; border-radius: 0.25rem; cursor: pointer; font-size: 0.875rem; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-primary { background-color: #007bff; color: white; }
  .btn-secondary { background-color: #6c757d; color: white; }
  .btn-success { background-color: #28a745; color: white; }
  .btn-danger { background-color: #dc3545; color: white; }
  .btn-warning { background-color: #ffc107; color: #000; }
  .loading { text-align: center; padding: 2rem; color: #6c757d; }
  .no-data { text-align: center; padding: 2rem; color: #6c757d; font-style: italic; }
`;
document.head.appendChild(style);
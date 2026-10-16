/**
 * Vehicle Service Admin Panel
 * Core Admin JavaScript: Authentication, API Client, UI Interactions, and Notifications
 */

const API_BASE = '/api';

// ==========================================================================
// Authentication Storage Helpers
// ==========================================================================
const Auth = {
  getToken() {
    return localStorage.getItem('vehicle_admin_token') || sessionStorage.getItem('vehicle_admin_token');
  },
  
  setToken(token, remember = true) {
    if (remember) {
      localStorage.setItem('vehicle_admin_token', token);
    } else {
      sessionStorage.setItem('vehicle_admin_token', token);
    }
    // Also set cookie so server or middleware can access if needed
    document.cookie = `auth_token=${encodeURIComponent(token)}; path=/; max-age=86400; SameSite=Lax`;
  },
  
  getUser() {
    try {
      const data = localStorage.getItem('vehicle_admin_user') || sessionStorage.getItem('vehicle_admin_user');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },
  
  setUser(user, remember = true) {
    const serialized = JSON.stringify(user);
    if (remember) {
      localStorage.setItem('vehicle_admin_user', serialized);
    } else {
      sessionStorage.setItem('vehicle_admin_user', serialized);
    }
  },
  
  clear() {
    localStorage.removeItem('vehicle_admin_token');
    localStorage.removeItem('vehicle_admin_user');
    sessionStorage.removeItem('vehicle_admin_token');
    sessionStorage.removeItem('vehicle_admin_user');
    document.cookie = 'auth_token=; path=/; max-age=0;';
  },
  
  isLoggedIn() {
    return !!this.getToken();
  },
  
  logout() {
    Swal.fire({
      title: 'Sign Out?',
      text: 'Are you sure you want to log out of the admin panel?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Yes, Sign Out'
    }).then((result) => {
      if (result.isConfirmed) {
        Auth.clear();
        Notify.toast('success', 'Logged out successfully');
        setTimeout(() => {
          window.location.href = '/login';
        }, 500);
      }
    });
  }
};

// ==========================================================================
// Notifications & Alerts (SweetAlert2)
// ==========================================================================
const Notify = {
  toast(icon = 'success', title = '') {
    if (typeof Swal !== 'undefined') {
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.addEventListener('mouseenter', Swal.stopTimer);
          toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
      });
      Toast.fire({ icon, title });
    } else {
      alert(title);
    }
  },

  success(message, title = 'Success') {
    if (typeof Swal !== 'undefined') {
      return Swal.fire({ icon: 'success', title, text: message, confirmButtonColor: '#2563eb' });
    }
    alert(`${title}: ${message}`);
  },

  error(message, title = 'Error') {
    if (typeof Swal !== 'undefined') {
      return Swal.fire({ icon: 'error', title, text: message, confirmButtonColor: '#ef4444' });
    }
    alert(`${title}: ${message}`);
  },

  async confirm(title = 'Are you sure?', text = "You won't be able to revert this!") {
    if (typeof Swal !== 'undefined') {
      const result = await Swal.fire({
        title,
        text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#64748b',
        confirmButtonText: 'Yes, delete it!'
      });
      return result.isConfirmed;
    }
    return confirm(`${title}\n${text}`);
  }
};

// ==========================================================================
// Centralized API Client
// ==========================================================================
async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : (endpoint.startsWith('/') ? endpoint : `${API_BASE}/${endpoint}`);
  const headers = options.headers || {};
  
  // Attach JWT Bearer Token if present
  const token = Auth.getToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // If sending JSON body, set Content-Type header
  if (options.body && !(options.body instanceof FormData) && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  
  options.headers = headers;

  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type') || '';
    
    let data = null;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { status: response.ok, msg: await response.text() };
    }

    // Handle token expiry or unauthorized
    if (response.status === 401) {
      Auth.clear();
      Swal.fire({
        icon: 'warning',
        title: 'Session Expired',
        text: 'Your login session has expired. Please sign in again.',
        confirmButtonColor: '#2563eb',
        confirmButtonText: 'Login'
      }).then(() => {
        window.location.href = '/login';
      });
      throw new Error('Unauthorized');
    }

    return {
      ok: response.ok,
      status: response.status,
      data
    };
  } catch (error) {
    console.error(`API Error on [${options.method || 'GET'}] ${url}:`, error);
    throw error;
  }
}

// ==========================================================================
// Formatting & Utilities
// ==========================================================================
function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return dateStr;
  }
}

function formatCurrency(val) {
  const num = Number(val) || 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getMediaUrl(photoPath, fallback = '/public/images/placeholder.svg') {
  if (!photoPath) return fallback;
  if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
    return photoPath;
  }
  return `/upload/${photoPath}`;
}

// ==========================================================================
// DOM Initialization & Global Event Listeners
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Check auth for protected pages (all except /login and /register)
  const path = window.location.pathname;
  const isAuthPage = path === '/login' || path === '/register';
  
  if (!isAuthPage) {
    if (!Auth.isLoggedIn()) {
      window.location.href = '/login';
      return;
    }
    
    // Populate user profile info in navbar/sidebar
    const user = Auth.getUser();
    if (user) {
      document.querySelectorAll('.admin-user-name').forEach(el => el.textContent = user.name || 'Admin');
      document.querySelectorAll('.admin-user-role').forEach(el => el.textContent = user.role || 'Administrator');
      document.querySelectorAll('.admin-user-phone').forEach(el => el.textContent = user.phone || '');
      if (user.photo) {
        document.querySelectorAll('.admin-user-avatar').forEach(el => {
          el.src = getMediaUrl(user.photo);
        });
      }
    }
  }

  // Sidebar Desktop Collapse Toggle
  const toggleBtn = document.getElementById('sidebarToggleBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-collapsed');
      const isCollapsed = document.body.classList.contains('sidebar-collapsed');
      localStorage.setItem('vehicle_admin_sidebar_collapsed', isCollapsed ? '1' : '0');
    });
    
    // Restore sidebar collapse state
    if (localStorage.getItem('vehicle_admin_sidebar_collapsed') === '1' && window.innerWidth >= 992) {
      document.body.classList.add('sidebar-collapsed');
    }
  }

  // Mobile Sidebar Drawer Toggle
  const mobileToggleBtn = document.getElementById('mobileSidebarToggleBtn');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (mobileToggleBtn) {
    mobileToggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-open');
    });
  }
  if (backdrop) {
    backdrop.addEventListener('click', () => {
      document.body.classList.remove('sidebar-open');
    });
  }

  // Logout Buttons
  document.querySelectorAll('.btn-logout').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      Auth.logout();
    });
  });

  // Global Table Search filter helper
  const tableSearchInput = document.getElementById('tableSearchInput');
  if (tableSearchInput) {
    tableSearchInput.addEventListener('keyup', function() {
      const filter = this.value.toLowerCase();
      const targetTable = document.querySelector('.searchable-table tbody');
      if (targetTable) {
        const rows = targetTable.getElementsByTagName('tr');
        for (let i = 0; i < rows.length; i++) {
          const text = rows[i].textContent.toLowerCase();
          rows[i].style.display = text.indexOf(filter) > -1 ? '' : 'none';
        }
      }
    });
  }

  // Auto-load Live Badge Counts for sidebar
  if (!isAuthPage) {
    loadSidebarBadgeCounts();
  }
});

// Load real counts to display in sidebar badges
async function loadSidebarBadgeCounts() {
  try {
    // Users count
    const usersRes = await apiRequest('/api/getAllUser').catch(() => null);
    if (usersRes && usersRes.ok && usersRes.data.result) {
      const userCount = usersRes.data.result.length;
      const el = document.getElementById('badgeUserCount');
      if (el) el.textContent = userCount;
    }

    // Categories count
    const catRes = await apiRequest('/api/getAllCategory?limit=1').catch(() => null);
    if (catRes && catRes.ok && catRes.data.totalItem !== undefined) {
      const el = document.getElementById('badgeCategoryCount');
      if (el) el.textContent = catRes.data.totalItem;
    }

    // Bookings count
    const bookRes = await apiRequest('/api/bookingHistory', { method: 'POST', body: { uid: 'all', page: 1 } }).catch(() => null);
    if (bookRes && bookRes.ok && bookRes.data.totalItem !== undefined) {
      const el = document.getElementById('badgeBookingCount');
      if (el) el.textContent = bookRes.data.totalItem;
    }

    // Shops count
    const shopRes = await apiRequest('/api/fetchShop', { method: 'POST', body: { page: 1, limit: 1 } }).catch(() => null);
    if (shopRes && shopRes.ok && shopRes.data.totalPage) {
      const el = document.getElementById('badgeShopCount');
      if (el && shopRes.data.result) el.textContent = '50+';
    }
  } catch (e) {
    // Non-fatal background refresh
  }
}

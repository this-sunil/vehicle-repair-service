/**
 * Corona Admin Panel — Core JavaScript
 * Vehicle Service Admin
 * Bootstrap 5 · Pure Vanilla JS · No jQuery
 */

(function () {
  'use strict';

  /* ── Sidebar Toggle ──────────────────────────────────────── */
  const sidebar = document.getElementById('coronaSidebar');
  const toggleBtn = document.getElementById('sidebarToggleBtn');
  const backdrop = document.getElementById('sidebarBackdrop');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      if (window.innerWidth >= 992) {
        document.body.classList.toggle('sidebar-collapsed');
        const icon = toggleBtn.querySelector('i');
        if (icon) {
          icon.className = document.body.classList.contains('sidebar-collapsed')
            ? 'bi bi-layout-sidebar-reverse'
            : 'bi bi-list';
        }
      } else {
        document.body.classList.toggle('sidebar-open');
      }
    });
  }

  if (backdrop) {
    backdrop.addEventListener('click', function () {
      document.body.classList.remove('sidebar-open');
    });
  }

  // Close sidebar on resize if on desktop
  window.addEventListener('resize', function () {
    if (window.innerWidth >= 992) {
      document.body.classList.remove('sidebar-open');
    }
  });

  /* ── Fullscreen ──────────────────────────────────────────── */
  const btnFullscreen = document.getElementById('btnFullscreen');
  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', function () {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(function () {});
        const icon = btnFullscreen.querySelector('i');
        if (icon) icon.className = 'bi bi-fullscreen-exit';
      } else {
        document.exitFullscreen();
        const icon = btnFullscreen.querySelector('i');
        if (icon) icon.className = 'bi bi-fullscreen';
      }
    });

    document.addEventListener('fullscreenchange', function () {
      const icon = btnFullscreen.querySelector('i');
      if (icon) {
        icon.className = document.fullscreenElement ? 'bi bi-fullscreen-exit' : 'bi bi-fullscreen';
      }
    });
  }

  /* ── Global Table Search (topbar) ────────────────────────── */
  const searchInput = document.getElementById('tableSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      const query = this.value.toLowerCase().trim();
      document.querySelectorAll('.searchable-table tbody tr').forEach(function (row) {
        row.style.display = row.textContent.toLowerCase().includes(query) ? '' : 'none';
      });
    });
  }

  /* ── Admin Profile Auto-Loader ───────────────────────────── */
  async function loadAdminProfile() {
    const token = Auth && Auth.getToken ? Auth.getToken() : (localStorage.getItem('token') || sessionStorage.getItem('token'));
    if (!token) return;

    try {
      const res = await fetch('/api/admin/me', {
        headers: {
          'Accept': 'application/json',
          'Authorization': 'Bearer ' + token
        }
      });
      if (!res.ok) return;
      const data = await res.json();
      const admin = data.admin || data.result || data;
      if (!admin) return;

      const name = admin.name || admin.username || 'Administrator';
      const role = admin.role || 'Super Admin';
      const photo = admin.photo ? '/upload/' + admin.photo : '/public/images/placeholder.svg';

      document.querySelectorAll('.admin-user-name').forEach(function (el) {
        el.textContent = name;
      });
      document.querySelectorAll('.admin-user-role').forEach(function (el) {
        el.textContent = role;
      });
      document.querySelectorAll('.admin-user-avatar').forEach(function (el) {
        el.src = photo;
        el.onerror = function () { this.src = '/public/images/placeholder.svg'; };
      });
    } catch (_) { /* silent fail */ }
  }

  // Run on load
  if (document.getElementById('coronaSidebar')) {
    loadAdminProfile();
  }

  /* ── Logout Confirmation ─────────────────────────────────── */
  document.querySelectorAll('.btn-logout').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          title: 'Sign out?',
          text: 'You will be logged out of the Corona admin panel.',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Yes, Sign Out',
          cancelButtonText: 'Cancel',
          confirmButtonColor: '#6571ff',
          cancelButtonColor: '#f0f1f8',
          reverseButtons: true,
          customClass: {
            cancelButton: 'text-dark',
            popup: 'rounded-3'
          }
        }).then(function (result) {
          if (result.isConfirmed) {
            if (typeof Auth !== 'undefined' && Auth.clearTokens) Auth.clearTokens();
            window.location.href = '/auth/logout';
          }
        });
      } else {
        if (confirm('Sign out of the admin panel?')) {
          window.location.href = '/auth/logout';
        }
      }
    });
  });

  /* ── Auto-dismiss Flash Alerts ───────────────────────────── */
  setTimeout(function () {
    document.querySelectorAll('#flashAlertContainer .alert').forEach(function (alert) {
      if (typeof bootstrap !== 'undefined') {
        const bsAlert = bootstrap.Alert.getOrCreateInstance(alert);
        bsAlert.close();
      } else {
        alert.style.opacity = '0';
        setTimeout(function () { alert.remove(); }, 300);
      }
    });
  }, 5000);

  /* ── Refresh Dashboard Buttons ───────────────────────────── */
  ['btnRefreshDashboard', 'btnRefreshDashboard2'].forEach(function (id) {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', function () {
        const icon = btn.querySelector('i');
        if (icon) {
          icon.style.animation = 'spin 0.6s linear';
          setTimeout(function () { icon.style.animation = ''; }, 700);
        }
        if (typeof loadDashboardKPIs === 'function') loadDashboardKPIs();
        if (typeof loadDashboardCharts === 'function') loadDashboardCharts();
        if (typeof loadRecentBookings === 'function') loadRecentBookings();
        if (typeof loadRecentUsers === 'function') loadRecentUsers();
      });
    }
  });

  /* ── Image Preview on File Input ─────────────────────────── */
  document.querySelectorAll('input[type="file"][accept*="image"]').forEach(function (input) {
    input.addEventListener('change', function () {
      const file = this.files[0];
      if (!file) return;

      const reader = new FileReader();
      const previewId = this.dataset.preview;

      reader.onload = function (e) {
        // Update associated preview if data-preview attribute set
        if (previewId) {
          const preview = document.getElementById(previewId);
          if (preview) {
            preview.src = e.target.result;
            preview.style.display = 'block';
          }
        }
      };
      reader.readAsDataURL(file);
    });
  });

})();

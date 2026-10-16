/**
 * Users Management Controller
 * Full CRUD operations against /api/getAllUser, /api/getProfile, /api/register, /api/updateProfile, /api/deleteUserById
 */

let allUsers = [];

document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('usersTableBody');
  if (tableBody) {
    loadUsers();
  }

  // Quick Create Modal Form
  const createForm = document.getElementById('createUserForm');
  if (createForm) {
    createForm.addEventListener('submit', handleCreateUser);
  }

  // Edit User Modal Form
  const editForm = document.getElementById('editUserForm');
  if (editForm) {
    editForm.addEventListener('submit', handleUpdateUser);
  }

  // Standalone create page form
  const standaloneCreateForm = document.getElementById('standaloneCreateUserForm');
  if (standaloneCreateForm) {
    standaloneCreateForm.addEventListener('submit', handleCreateUser);
  }

  // Standalone edit page form
  const standaloneEditForm = document.getElementById('standaloneEditUserForm');
  if (standaloneEditForm) {
    standaloneEditForm.addEventListener('submit', handleUpdateUser);
  }

  // Search input
  const searchInput = document.getElementById('userSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      filterUsers(searchInput.value);
    });
  }

  // Role filter
  const roleFilter = document.getElementById('userRoleFilter');
  if (roleFilter) {
    roleFilter.addEventListener('change', () => {
      filterUsers(searchInput ? searchInput.value : '');
    });
  }
});

async function loadUsers() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="6" class="text-center py-4 text-muted">
        <div class="spinner-border spinner-border-sm me-2 text-primary"></div>
        Loading users...
      </td>
    </tr>
  `;

  try {
    const res = await apiRequest('/api/getAllUser');
    if (res.ok && res.data.result) {
      allUsers = res.data.result;
      renderUsersTable(allUsers);
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-4 text-muted">
            <i class="bi bi-people fs-2 d-block mb-2"></i>
            ${res.data.msg || 'No users found.'}
          </td>
        </tr>
      `;
    }
  } catch (error) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-4 text-danger">
          <i class="bi bi-exclamation-triangle fs-2 d-block mb-2"></i>
          Failed to load users. Please verify your connection.
        </td>
      </tr>
    `;
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('usersTableBody');
  const countSpan = document.getElementById('usersCountSpan');
  if (countSpan) countSpan.textContent = users.length;
  if (!tbody) return;

  if (users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-5 text-muted">
          <div class="empty-state">
            <div class="empty-state-icon"><i class="bi bi-people"></i></div>
            <div class="empty-state-title">No users matched</div>
            <p class="empty-state-text">No user accounts found matching your query or filter criteria.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = users.map(user => {
    const name = escapeHtml(user.name || 'Unnamed');
    const phone = escapeHtml(user.phone ? String(user.phone) : '—');
    const role = (user.role || 'user').toLowerCase();
    const joined = formatDate(user.created_at);
    const photo = user.photo ? getMediaUrl(user.photo) : null;
    
    const roleBadge = role === 'admin'
      ? '<span class="badge bg-danger-subtle text-danger px-2 py-1">Admin</span>'
      : '<span class="badge bg-success-subtle text-success px-2 py-1">Customer</span>';

    const avatarHtml = photo
      ? `<img src="${photo}" alt="${name}" class="table-thumb rounded-circle" onerror="this.src='/public/images/placeholder.svg'">`
      : `<div class="avatar-initials">${name.charAt(0).toUpperCase()}</div>`;

    return `
      <tr data-user-id="${user.id}">
        <td>#${user.id}</td>
        <td>
          <div class="d-flex align-items-center gap-2">
            ${avatarHtml}
            <div>
              <div class="fw-semibold text-dark">${name}</div>
              <div class="small text-muted">User #${user.id}</div>
            </div>
          </div>
        </td>
        <td class="font-monospace text-muted">${phone}</td>
        <td>${roleBadge}</td>
        <td class="text-muted small">${joined}</td>
        <td class="actions-cell">
          <div class="btn-group btn-group-sm">
            <a href="/users/${user.id}" class="btn btn-outline-secondary action-btn" title="View Profile">
              <i class="bi bi-eye"></i>
            </a>
            <button type="button" class="btn btn-outline-primary action-btn" onclick="openEditUserModal(${user.id})" title="Edit User">
              <i class="bi bi-pencil"></i>
            </button>
            <button type="button" class="btn btn-outline-danger action-btn" onclick="deleteUser(${user.id}, '${name.replace(/'/g, "\\'")}')" title="Delete User">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterUsers(query = '') {
  const term = query.toLowerCase().trim();
  const roleFilter = document.getElementById('userRoleFilter');
  const selectedRole = roleFilter ? roleFilter.value.toLowerCase() : '';

  const filtered = allUsers.filter(u => {
    const matchesSearch = !term ||
      (u.name && u.name.toLowerCase().includes(term)) ||
      (u.phone && String(u.phone).includes(term)) ||
      String(u.id).includes(term);

    const matchesRole = !selectedRole || (u.role && u.role.toLowerCase() === selectedRole);

    return matchesSearch && matchesRole;
  });

  renderUsersTable(filtered);
}

// Create User
async function handleCreateUser(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const spinner = form.querySelector('.spinner-border');

  const name = form.querySelector('[name="name"]').value.trim();
  const phone = form.querySelector('[name="phone"]').value.trim();
  const pass = form.querySelector('[name="pass"]').value.trim();

  if (!name || !phone || !pass) {
    Notify.error('Please fill in name, phone, and password.', 'Validation Error');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  if (spinner) spinner.classList.remove('d-none');

  try {
    const formData = new FormData(form);
    const res = await apiRequest('/api/register', {
      method: 'POST',
      body: formData
    });

    if (res.ok && res.data.status) {
      Notify.toast('success', 'User registered successfully!');
      
      // Close modal if open
      const modalEl = document.getElementById('createUserModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        form.reset();
        loadUsers();
      } else {
        setTimeout(() => window.location.href = '/users', 800);
      }
    } else {
      Notify.error(res.data.msg || 'Registration failed. User may already exist.');
    }
  } catch (error) {
    Notify.error('Could not complete user registration.');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (spinner) spinner.classList.add('d-none');
  }
}

// Open Edit Modal & Prepopulate
async function openEditUserModal(userId) {
  const user = allUsers.find(u => u.id === userId);
  const modalEl = document.getElementById('editUserModal');
  if (!modalEl) {
    window.location.href = `/users/${userId}/edit`;
    return;
  }

  const form = document.getElementById('editUserForm');
  form.reset();
  form.querySelector('[name="id"]').value = userId;
  form.querySelector('[name="name"]').value = user ? user.name : '';
  form.querySelector('[name="phone"]').value = user ? user.phone : '';

  const imgPrev = document.getElementById('editUserPhotoPreview');
  if (imgPrev) {
    imgPrev.src = user && user.photo ? getMediaUrl(user.photo) : '/public/images/placeholder.svg';
  }

  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

// Update User Profile
async function handleUpdateUser(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const spinner = form.querySelector('.spinner-border');

  const id = form.querySelector('[name="id"]').value;
  const name = form.querySelector('[name="name"]').value.trim();
  const phone = form.querySelector('[name="phone"]').value.trim();

  if (!id || !name || !phone) {
    Notify.error('User ID, Name, and Phone are required.', 'Validation Error');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  if (spinner) spinner.classList.remove('d-none');

  try {
    const formData = new FormData(form);
    const res = await apiRequest('/api/updateProfile', {
      method: 'POST',
      body: formData
    });

    if (res.ok && res.data.status) {
      Notify.toast('success', 'User updated successfully!');
      const modalEl = document.getElementById('editUserModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        loadUsers();
      } else {
        setTimeout(() => window.location.href = `/users/${id}`, 800);
      }
    } else {
      Notify.error(res.data.msg || 'Failed to update user profile.');
    }
  } catch (error) {
    Notify.error('Error updating user.');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (spinner) spinner.classList.add('d-none');
  }
}

// Delete User
async function deleteUser(userId, userName) {
  const confirmed = await Notify.confirm(
    `Delete ${userName}?`,
    `Are you sure you want to permanently delete user #${userId}? All associated bookings may be affected.`
  );

  if (!confirmed) return;

  try {
    const res = await apiRequest('/api/deleteUserById', {
      method: 'DELETE',
      body: { id: userId }
    });

    if (res.ok && res.data.status) {
      Notify.toast('success', `User #${userId} deleted successfully.`);
      loadUsers();
    } else {
      Notify.error(res.data.msg || 'Failed to delete user.');
    }
  } catch (error) {
    Notify.error('Could not delete user.');
  }
}

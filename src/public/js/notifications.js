/**
 * Notifications Management Controller
 * Full CRUD operations against /api/fetchNotification, /api/addNotification, /api/updateNotification, /api/deleteNotification
 */

let allNotifications = [];

document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('notificationsTableBody');
  if (tableBody) {
    loadNotifications();
  }

  // Create Notification Modal Form
  const createForm = document.getElementById('createNotificationForm');
  if (createForm) {
    createForm.addEventListener('submit', handleCreateNotification);
  }

  // Edit Notification Modal Form
  const editForm = document.getElementById('editNotificationForm');
  if (editForm) {
    editForm.addEventListener('submit', handleUpdateNotification);
  }

  // Standalone create page form
  const standaloneCreate = document.getElementById('standaloneCreateNotificationForm');
  if (standaloneCreate) {
    standaloneCreate.addEventListener('submit', handleCreateNotification);
  }

  // Standalone edit page form
  const standaloneEdit = document.getElementById('standaloneEditNotificationForm');
  if (standaloneEdit) {
    standaloneEdit.addEventListener('submit', handleUpdateNotification);
  }

  // Search input
  const searchInput = document.getElementById('notificationSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      filterNotifications(searchInput.value);
    });
  }
});

async function loadNotifications() {
  const tbody = document.getElementById('notificationsTableBody');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center py-4 text-muted">
        <div class="spinner-border spinner-border-sm me-2 text-primary"></div>
        Loading broadcast notifications...
      </td>
    </tr>
  `;

  try {
    const res = await apiRequest('/api/fetchNotification', {
      method: 'POST',
      body: { page: 1 }
    });

    if (res.ok && res.data.result) {
      allNotifications = res.data.result;
      renderNotificationsTable(allNotifications);
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-4 text-muted">
            <i class="bi bi-bell-slash fs-2 d-block mb-2"></i>
            ${res.data.msg || 'No notifications sent yet.'}
          </td>
        </tr>
      `;
    }
  } catch (error) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-4 text-danger">
          <i class="bi bi-exclamation-triangle fs-2 d-block mb-2"></i>
          Failed to load notifications.
        </td>
      </tr>
    `;
  }
}

function renderNotificationsTable(notifications) {
  const tbody = document.getElementById('notificationsTableBody');
  const countSpan = document.getElementById('notificationsCountSpan');
  if (countSpan) countSpan.textContent = notifications.length;
  if (!tbody) return;

  if (notifications.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-5 text-muted">
          <div class="empty-state">
            <div class="empty-state-icon"><i class="bi bi-bell"></i></div>
            <div class="empty-state-title">No notifications yet</div>
            <p class="empty-state-text">Send customer broadcast alerts or service announcements.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = notifications.map(n => {
    const title = escapeHtml(n.title || 'Broadcast');
    const content = escapeHtml(n.subtitle || n.description || '—');
    const created = formatDate(n.created_at);
    const photo = n.photo ? getMediaUrl(n.photo) : null;

    const imgHtml = photo
      ? `<img src="${photo}" alt="${title}" class="table-thumb" onerror="this.src='/public/images/placeholder.svg'">`
      : `<div class="table-thumb d-flex align-items-center justify-content-center bg-light text-muted"><i class="bi bi-bell fs-5"></i></div>`;

    return `
      <tr data-notification-id="${n.id}">
        <td class="fw-semibold">#${n.id}</td>
        <td>
          <div class="d-flex align-items-center gap-2">
            ${imgHtml}
            <div>
              <div class="fw-semibold text-dark">${title}</div>
              <div class="small text-muted text-truncate" style="max-width: 250px;">${content}</div>
            </div>
          </div>
        </td>
        <td class="small text-muted" style="max-width: 320px;">
          <div class="text-truncate">${content}</div>
        </td>
        <td class="small text-muted">${created}</td>
        <td class="actions-cell">
          <div class="btn-group btn-group-sm">
            <a href="/notifications/${n.id}" class="btn btn-outline-secondary action-btn" title="View Notification">
              <i class="bi bi-eye"></i>
            </a>
            <button type="button" class="btn btn-outline-primary action-btn" onclick="openEditNotificationModal(${n.id})" title="Edit Notification">
              <i class="bi bi-pencil"></i>
            </button>
            <button type="button" class="btn btn-outline-danger action-btn" onclick="deleteNotification(${n.id}, '${title.replace(/'/g, "\\'")}')" title="Delete Notification">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterNotifications(query = '') {
  const term = query.toLowerCase().trim();
  const filtered = allNotifications.filter(n => {
    const title = (n.title || '').toLowerCase();
    const sub = (n.subtitle || n.description || '').toLowerCase();
    return !term || title.includes(term) || sub.includes(term) || String(n.id).includes(term);
  });
  renderNotificationsTable(filtered);
}

// Create Notification
async function handleCreateNotification(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const spinner = form.querySelector('.spinner-border');

  const title = form.querySelector('[name="title"]').value.trim();
  const description = form.querySelector('[name="description"]').value.trim();

  if (!title || !description) {
    Notify.error('Title and message content are required.', 'Validation Error');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  if (spinner) spinner.classList.remove('d-none');

  try {
    const formData = new FormData(form);
    const res = await apiRequest('/api/addNotification', {
      method: 'POST',
      body: formData
    });

    if (res.ok && res.data.status) {
      Notify.toast('success', 'Notification broadcasted successfully!');
      const modalEl = document.getElementById('createNotificationModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        form.reset();
        loadNotifications();
      } else {
        setTimeout(() => window.location.href = '/notifications', 800);
      }
    } else {
      Notify.error(res.data.msg || 'Failed to send notification.');
    }
  } catch (error) {
    Notify.error('Error creating notification.');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (spinner) spinner.classList.add('d-none');
  }
}

// Open Edit Modal
function openEditNotificationModal(id) {
  const note = allNotifications.find(n => n.id === id);
  const modalEl = document.getElementById('editNotificationModal');
  if (!modalEl) {
    window.location.href = `/notifications/${id}/edit`;
    return;
  }

  const form = document.getElementById('editNotificationForm');
  form.reset();
  form.querySelector('[name="id"]').value = id;
  form.querySelector('[name="title"]').value = note ? note.title : '';
  form.querySelector('[name="description"]').value = note ? (note.subtitle || note.description) : '';

  const imgPrev = document.getElementById('editNotificationPhotoPreview');
  if (imgPrev) {
    imgPrev.src = note && note.photo ? getMediaUrl(note.photo) : '/public/images/placeholder.svg';
  }

  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

// Update Notification
async function handleUpdateNotification(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const spinner = form.querySelector('.spinner-border');

  const id = form.querySelector('[name="id"]').value;
  const title = form.querySelector('[name="title"]').value.trim();
  const description = form.querySelector('[name="description"]').value.trim();

  if (!id || !title || !description) {
    Notify.error('ID, Title, and Description are required.', 'Validation Error');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  if (spinner) spinner.classList.remove('d-none');

  try {
    const formData = new FormData(form);
    const res = await apiRequest('/api/updateNotification', {
      method: 'PATCH',
      body: formData
    });

    if (res.ok && res.data.status) {
      Notify.toast('success', 'Notification updated successfully!');
      const modalEl = document.getElementById('editNotificationModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        loadNotifications();
      } else {
        setTimeout(() => window.location.href = `/notifications/${id}`, 800);
      }
    } else {
      Notify.error(res.data.msg || 'Failed to update notification.');
    }
  } catch (error) {
    Notify.error('Error updating notification.');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (spinner) spinner.classList.add('d-none');
  }
}

// Delete Notification
async function deleteNotification(id, title) {
  const confirmed = await Notify.confirm(
    `Delete ${title}?`,
    `Are you sure you want to delete notification #${id}?`
  );

  if (!confirmed) return;

  try {
    const res = await apiRequest('/api/deleteNotification', {
      method: 'DELETE',
      body: { id }
    });

    if (res.ok && res.data.status) {
      Notify.toast('success', `Notification #${id} deleted.`);
      loadNotifications();
    } else {
      Notify.error(res.data.msg || 'Failed to delete notification.');
    }
  } catch (error) {
    Notify.error('Could not delete notification.');
  }
}

/**
 * Vehicle Services Management Controller
 * Full CRUD operations against /api/getAllService, /api/searchService, /api/addService, /api/updateService, /api/deleteService
 */

let allServices = [];

document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('servicesTableBody');
  if (tableBody) {
    loadServices();
  }

  // Create Service Modal
  const createForm = document.getElementById('createServiceForm');
  if (createForm) {
    createForm.addEventListener('submit', handleCreateService);
  }

  // Edit Service Modal
  const editForm = document.getElementById('editServiceForm');
  if (editForm) {
    editForm.addEventListener('submit', handleUpdateService);
  }

  // Standalone create page form
  const standaloneCreate = document.getElementById('standaloneCreateServiceForm');
  if (standaloneCreate) {
    standaloneCreate.addEventListener('submit', handleCreateService);
  }

  // Standalone edit page form
  const standaloneEdit = document.getElementById('standaloneEditServiceForm');
  if (standaloneEdit) {
    standaloneEdit.addEventListener('submit', handleUpdateService);
  }

  // Live search input
  const searchInput = document.getElementById('serviceSearchInput');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        searchServices(searchInput.value);
      }, 300);
    });
  }
});

async function loadServices() {
  const tbody = document.getElementById('servicesTableBody');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center py-4 text-muted">
        <div class="spinner-border spinner-border-sm me-2 text-primary"></div>
        Loading vehicle services...
      </td>
    </tr>
  `;

  try {
    const res = await apiRequest('/api/getAllService', {
      method: 'POST',
      body: { page: 1, limit: 100 }
    });

    if (res.ok && res.data.result) {
      allServices = res.data.result;
      renderServicesTable(allServices);
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-4 text-muted">
            <i class="bi bi-tools fs-2 d-block mb-2"></i>
            ${res.data.msg || 'No services found.'}
          </td>
        </tr>
      `;
    }
  } catch (error) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-4 text-danger">
          <i class="bi bi-exclamation-triangle fs-2 d-block mb-2"></i>
          Failed to load vehicle services.
        </td>
      </tr>
    `;
  }
}

async function searchServices(keyword = '') {
  const term = keyword.trim();
  if (!term) {
    loadServices();
    return;
  }

  try {
    const res = await apiRequest('/api/searchService', {
      method: 'POST',
      body: { search: term, limit: 50, page: 1 }
    });

    if (res.ok && res.data.result) {
      renderServicesTable(res.data.result);
    } else {
      renderServicesTable([]);
    }
  } catch (e) {
    // Fallback to local filter
    const filtered = allServices.filter(s =>
      (s.title && s.title.toLowerCase().includes(term.toLowerCase())) ||
      (s.description && s.description.toLowerCase().includes(term.toLowerCase()))
    );
    renderServicesTable(filtered);
  }
}

function renderServicesTable(services) {
  const tbody = document.getElementById('servicesTableBody');
  const countSpan = document.getElementById('servicesCountSpan');
  if (countSpan) countSpan.textContent = services.length;
  if (!tbody) return;

  if (services.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-5 text-muted">
          <div class="empty-state">
            <div class="empty-state-icon"><i class="bi bi-tools"></i></div>
            <div class="empty-state-title">No services found</div>
            <p class="empty-state-text">Add your first vehicle maintenance or repair service catalog item.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = services.map(s => {
    const title = escapeHtml(s.title || 'Untitled');
    const desc = escapeHtml(s.description || '—');
    const created = formatDate(s.created_at);
    const photo = s.photo ? getMediaUrl(s.photo) : null;

    const imgHtml = photo
      ? `<img src="${photo}" alt="${title}" class="table-thumb" onerror="this.src='/public/images/placeholder.svg'">`
      : `<div class="table-thumb d-flex align-items-center justify-content-center bg-light text-muted"><i class="bi bi-wrench-adjustable fs-5"></i></div>`;

    return `
      <tr data-service-id="${s.id}">
        <td class="fw-semibold">#${s.id}</td>
        <td>
          <div class="d-flex align-items-center gap-3">
            ${imgHtml}
            <div>
              <div class="fw-semibold text-dark">${title}</div>
              <div class="small text-muted text-truncate" style="max-width: 280px;">${desc}</div>
            </div>
          </div>
        </td>
        <td class="small text-muted" style="max-width: 320px;">
          <div class="text-truncate">${desc}</div>
        </td>
        <td class="small text-muted">${created}</td>
        <td class="actions-cell">
          <div class="btn-group btn-group-sm">
            <a href="/services/${s.id}" class="btn btn-outline-secondary action-btn" title="View Details">
              <i class="bi bi-eye"></i>
            </a>
            <button type="button" class="btn btn-outline-primary action-btn" onclick="openEditServiceModal(${s.id})" title="Edit Service">
              <i class="bi bi-pencil"></i>
            </button>
            <button type="button" class="btn btn-outline-danger action-btn" onclick="deleteService(${s.id}, '${title.replace(/'/g, "\\'")}')" title="Delete Service">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Create Service
async function handleCreateService(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const spinner = form.querySelector('.spinner-border');

  const title = form.querySelector('[name="title"]').value.trim();
  const description = form.querySelector('[name="description"]').value.trim();

  if (!title || !description) {
    Notify.error('Title and description are required.', 'Validation Error');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  if (spinner) spinner.classList.remove('d-none');

  try {
    const formData = new FormData(form);
    const res = await apiRequest('/api/addService', {
      method: 'POST',
      body: formData
    });

    if (res.ok && res.data.status) {
      Notify.toast('success', 'Service added successfully!');
      const modalEl = document.getElementById('createServiceModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        form.reset();
        loadServices();
      } else {
        setTimeout(() => window.location.href = '/services', 800);
      }
    } else {
      Notify.error(res.data.msg || 'Failed to insert service. Title may already exist.');
    }
  } catch (error) {
    Notify.error('Error adding service.');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (spinner) spinner.classList.add('d-none');
  }
}

// Open Edit Modal
function openEditServiceModal(id) {
  const service = allServices.find(s => s.id === id);
  const modalEl = document.getElementById('editServiceModal');
  if (!modalEl) {
    window.location.href = `/services/${id}/edit`;
    return;
  }

  const form = document.getElementById('editServiceForm');
  form.reset();
  form.querySelector('[name="id"]').value = id;
  form.querySelector('[name="title"]').value = service ? service.title : '';
  form.querySelector('[name="description"]').value = service ? service.description : '';

  const imgPrev = document.getElementById('editServicePhotoPreview');
  if (imgPrev) {
    imgPrev.src = service && service.photo ? getMediaUrl(service.photo) : '/public/images/placeholder.svg';
  }

  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

// Update Service
async function handleUpdateService(e) {
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
    const res = await apiRequest('/api/updateService', {
      method: 'PUT',
      body: formData
    });

    if (res.ok && res.data.status) {
      Notify.toast('success', 'Service updated successfully!');
      const modalEl = document.getElementById('editServiceModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        loadServices();
      } else {
        setTimeout(() => window.location.href = `/services/${id}`, 800);
      }
    } else {
      Notify.error(res.data.msg || 'Failed to update service.');
    }
  } catch (error) {
    Notify.error('Error updating service.');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (spinner) spinner.classList.add('d-none');
  }
}

// Delete Service
async function deleteService(id, title) {
  const confirmed = await Notify.confirm(
    `Delete ${title}?`,
    `Are you sure you want to delete service #${id}? This action cannot be undone.`
  );

  if (!confirmed) return;

  try {
    const res = await apiRequest('/api/deleteService', {
      method: 'POST',
      body: { id }
    });

    if (res.ok && res.data.status) {
      Notify.toast('success', `Service "${title}" deleted.`);
      loadServices();
    } else {
      Notify.error(res.data.msg || 'Failed to delete service.');
    }
  } catch (error) {
    Notify.error('Could not delete service.');
  }
}

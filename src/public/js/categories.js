/**
 * Categories Management Controller
 * Full CRUD operations against /api/getAllCategory, /api/addCategory, /api/updateCategory, /api/deleteCatById
 */

let allCategories = [];

document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('categoriesTableBody');
  if (tableBody) {
    loadCategories();
  }

  // Quick Create Modal Form
  const createForm = document.getElementById('createCategoryForm');
  if (createForm) {
    createForm.addEventListener('submit', handleCreateCategory);
  }

  // Edit Category Modal Form
  const editForm = document.getElementById('editCategoryForm');
  if (editForm) {
    editForm.addEventListener('submit', handleUpdateCategory);
  }

  // Standalone create page form
  const standaloneCreate = document.getElementById('standaloneCreateCategoryForm');
  if (standaloneCreate) {
    standaloneCreate.addEventListener('submit', handleCreateCategory);
  }

  // Standalone edit page form
  const standaloneEdit = document.getElementById('standaloneEditCategoryForm');
  if (standaloneEdit) {
    standaloneEdit.addEventListener('submit', handleUpdateCategory);
  }

  // Search input
  const searchInput = document.getElementById('categorySearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      filterCategories(searchInput.value);
    });
  }
});

async function loadCategories() {
  const tbody = document.getElementById('categoriesTableBody');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center py-4 text-muted">
        <div class="spinner-border spinner-border-sm me-2 text-primary"></div>
        Loading vehicle categories...
      </td>
    </tr>
  `;

  try {
    const res = await apiRequest('/api/getAllCategory?limit=100&page=1');
    if (res.ok && res.data.result) {
      allCategories = res.data.result;
      renderCategoriesTable(allCategories);
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-4 text-muted">
            <i class="bi bi-grid fs-2 d-block mb-2"></i>
            ${res.data.msg || 'No categories found.'}
          </td>
        </tr>
      `;
    }
  } catch (error) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-4 text-danger">
          <i class="bi bi-exclamation-triangle fs-2 d-block mb-2"></i>
          Failed to load categories.
        </td>
      </tr>
    `;
  }
}

function renderCategoriesTable(categories) {
  const tbody = document.getElementById('categoriesTableBody');
  const countSpan = document.getElementById('categoriesCountSpan');
  if (countSpan) countSpan.textContent = categories.length;
  if (!tbody) return;

  if (categories.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-5 text-muted">
          <div class="empty-state">
            <div class="empty-state-icon"><i class="bi bi-grid"></i></div>
            <div class="empty-state-title">No categories found</div>
            <p class="empty-state-text">Create your first vehicle category to categorize services.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = categories.map(cat => {
    const title = escapeHtml(cat.title || 'Untitled');
    const type = escapeHtml(cat.vehicle_type || '—');
    const created = formatDate(cat.created_at);
    const photo = cat.photo ? getMediaUrl(cat.photo) : null;

    const imgHtml = photo
      ? `<img src="${photo}" alt="${title}" class="table-thumb" onerror="this.src='/public/images/placeholder.svg'">`
      : `<div class="table-thumb d-flex align-items-center justify-content-center bg-light text-muted"><i class="bi bi-truck fs-5"></i></div>`;

    return `
      <tr data-category-id="${cat.cid}">
        <td class="fw-semibold">#${cat.cid}</td>
        <td>
          <div class="d-flex align-items-center gap-2">
            ${imgHtml}
            <div>
              <div class="fw-semibold text-dark">${title}</div>
              <div class="small text-muted">ID: ${cat.cid}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge bg-light text-primary border">${type}</span>
        </td>
        <td class="small text-muted">${created}</td>
        <td class="actions-cell">
          <div class="btn-group btn-group-sm">
            <a href="/categories/${cat.cid}" class="btn btn-outline-secondary action-btn" title="View Category">
              <i class="bi bi-eye"></i>
            </a>
            <button type="button" class="btn btn-outline-primary action-btn" onclick="openEditCategoryModal(${cat.cid})" title="Edit Category">
              <i class="bi bi-pencil"></i>
            </button>
            <button type="button" class="btn btn-outline-danger action-btn" onclick="deleteCategory(${cat.cid}, '${title.replace(/'/g, "\\'")}')" title="Delete Category">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterCategories(query = '') {
  const term = query.toLowerCase().trim();
  const filtered = allCategories.filter(c => {
    return !term ||
      (c.title && c.title.toLowerCase().includes(term)) ||
      (c.vehicle_type && c.vehicle_type.toLowerCase().includes(term)) ||
      String(c.cid).includes(term);
  });
  renderCategoriesTable(filtered);
}

// Create Category
async function handleCreateCategory(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const spinner = form.querySelector('.spinner-border');

  const title = form.querySelector('[name="title"]').value.trim();
  const type = form.querySelector('[name="type"]').value.trim();

  if (!title || !type) {
    Notify.error('Category title and vehicle type are required.', 'Validation Error');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  if (spinner) spinner.classList.remove('d-none');

  try {
    const formData = new FormData(form);
    const res = await apiRequest('/api/addCategory', {
      method: 'POST',
      body: formData
    });

    if (res.ok && res.data.status) {
      Notify.toast('success', 'Category added successfully!');
      const modalEl = document.getElementById('createCategoryModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        form.reset();
        loadCategories();
      } else {
        setTimeout(() => window.location.href = '/categories', 800);
      }
    } else {
      Notify.error(res.data.msg || 'Failed to insert category.');
    }
  } catch (error) {
    Notify.error('Error creating category.');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (spinner) spinner.classList.add('d-none');
  }
}

// Open Edit Modal
function openEditCategoryModal(cid) {
  const cat = allCategories.find(c => c.cid === cid);
  const modalEl = document.getElementById('editCategoryModal');
  if (!modalEl) {
    window.location.href = `/categories/${cid}/edit`;
    return;
  }

  const form = document.getElementById('editCategoryForm');
  form.reset();
  form.querySelector('[name="cid"]').value = cid;
  form.querySelector('[name="title"]').value = cat ? cat.title : '';
  form.querySelector('[name="type"]').value = cat ? cat.vehicle_type : '';

  const imgPrev = document.getElementById('editCategoryPhotoPreview');
  if (imgPrev) {
    imgPrev.src = cat && cat.photo ? getMediaUrl(cat.photo) : '/public/images/placeholder.svg';
  }

  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

// Update Category
async function handleUpdateCategory(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const spinner = form.querySelector('.spinner-border');

  const cid = form.querySelector('[name="cid"]').value;
  const title = form.querySelector('[name="title"]').value.trim();
  const type = form.querySelector('[name="type"]').value.trim();

  if (!cid || !title || !type) {
    Notify.error('Category ID, title, and vehicle type are required.', 'Validation Error');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  if (spinner) spinner.classList.remove('d-none');

  try {
    const formData = new FormData(form);
    const res = await apiRequest('/api/updateCategory', {
      method: 'POST',
      body: formData
    });

    if (res.ok && res.data.status) {
      Notify.toast('success', 'Category updated successfully!');
      const modalEl = document.getElementById('editCategoryModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        loadCategories();
      } else {
        setTimeout(() => window.location.href = `/categories/${cid}`, 800);
      }
    } else {
      Notify.error(res.data.msg || 'Failed to update category.');
    }
  } catch (error) {
    Notify.error('Error updating category.');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (spinner) spinner.classList.add('d-none');
  }
}

// Delete Category
async function deleteCategory(cid, title) {
  const confirmed = await Notify.confirm(
    `Delete ${title}?`,
    `Are you sure you want to delete category #${cid}? Services under this category may be affected.`
  );

  if (!confirmed) return;

  try {
    const res = await apiRequest('/api/deleteCatById', {
      method: 'DELETE',
      body: { cid }
    });

    if (res.ok && res.data.status) {
      Notify.toast('success', `Category "${title}" deleted.`);
      loadCategories();
    } else {
      Notify.error(res.data.msg || 'Failed to delete category.');
    }
  } catch (error) {
    Notify.error('Could not delete category.');
  }
}

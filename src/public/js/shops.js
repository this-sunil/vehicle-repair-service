/**
 * Service Centers / Shops Management Controller
 * Full CRUD operations against /api/fetchShop, /api/searchByCity, /api/addShop, /api/updateShop, /api/deleteShop
 */

let allShops = [];
let shopCurrentPage = 1;
let shopTotalPages = 1;

document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('shopsTableBody');
  if (tableBody) {
    loadShops(1);
  }

  // Create Shop Modal
  const createForm = document.getElementById('createShopForm');
  if (createForm) {
    createForm.addEventListener('submit', handleCreateShop);
  }

  // Edit Shop Modal
  const editForm = document.getElementById('editShopForm');
  if (editForm) {
    editForm.addEventListener('submit', handleUpdateShop);
  }

  // Standalone create page form
  const standaloneCreate = document.getElementById('standaloneCreateShopForm');
  if (standaloneCreate) {
    standaloneCreate.addEventListener('submit', handleCreateShop);
  }

  // Standalone edit page form
  const standaloneEdit = document.getElementById('standaloneEditShopForm');
  if (standaloneEdit) {
    standaloneEdit.addEventListener('submit', handleUpdateShop);
  }

  // Search input
  const searchInput = document.getElementById('shopSearchInput');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        filterShops(searchInput.value);
      }, 300);
    });
  }

  // City filter
  const cityFilter = document.getElementById('shopCityFilter');
  if (cityFilter) {
    cityFilter.addEventListener('change', () => {
      const city = cityFilter.value;
      if (city) {
        searchByCity(city);
      } else {
        loadShops(1);
      }
    });
  }
});

async function loadShops(page = 1) {
  const tbody = document.getElementById('shopsTableBody');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="text-center py-4 text-muted">
        <div class="spinner-border spinner-border-sm me-2 text-primary"></div>
        Loading partner service centers...
      </td>
    </tr>
  `;

  try {
    const res = await apiRequest('/api/fetchShop', {
      method: 'POST',
      body: { page, limit: 100 }
    });

    if (res.ok && res.data.result) {
      allShops = res.data.result;
      shopCurrentPage = res.data.currentPage || page;
      shopTotalPages = res.data.totalPage || 1;
      populateCityFilter(allShops);
      renderShopsTable(allShops);
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4 text-muted">
            <i class="bi bi-shop fs-2 d-block mb-2"></i>
            ${res.data.msg || 'No service centers found.'}
          </td>
        </tr>
      `;
    }
  } catch (error) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-danger">
          <i class="bi bi-exclamation-triangle fs-2 d-block mb-2"></i>
          Failed to load service centers.
        </td>
      </tr>
    `;
  }
}

async function searchByCity(city) {
  const tbody = document.getElementById('shopsTableBody');
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm me-1"></div> Filtering by ${city}...</td></tr>`;

  try {
    const res = await apiRequest('/api/searchByCity', {
      method: 'POST',
      body: { city, page: 1, limit: 100 }
    });

    if (res.ok && res.data.result) {
      renderShopsTable(res.data.result);
    } else {
      renderShopsTable([]);
    }
  } catch (e) {
    // Fallback to local filter
    const filtered = allShops.filter(s => (s.city || '').toLowerCase() === city.toLowerCase());
    renderShopsTable(filtered);
  }
}

function populateCityFilter(shops) {
  const filter = document.getElementById('shopCityFilter');
  if (!filter || filter.options.length > 1) return;

  const cities = [...new Set(shops.map(s => s.city).filter(Boolean))].sort();
  cities.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    filter.appendChild(opt);
  });
}

function renderShopsTable(shops) {
  const tbody = document.getElementById('shopsTableBody');
  const countSpan = document.getElementById('shopsCountSpan');
  if (countSpan) countSpan.textContent = shops.length;
  if (!tbody) return;

  if (shops.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-5 text-muted">
          <div class="empty-state">
            <div class="empty-state-icon"><i class="bi bi-shop"></i></div>
            <div class="empty-state-title">No service centers found</div>
            <p class="empty-state-text">No auto repair shops match your current criteria.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = shops.map(s => {
    const name = escapeHtml(s.shopname || s.shopName || 'Shop');
    const city = escapeHtml(s.city || '—');
    const hours = escapeHtml(s.shoptime || s.shopTime || '09:00 AM - 08:00 PM');
    const phone = escapeHtml(s.phone ? String(s.phone) : '—');
    const photo = (s.shopphoto || s.shopPhoto) ? getMediaUrl(s.shopphoto || s.shopPhoto) : null;
    const isActive = s.status === true || s.status === 'true' || s.status === 1;

    const statusBadge = isActive
      ? '<span class="badge-status badge-active">Operational</span>'
      : '<span class="badge-status badge-inactive">Closed</span>';

    const imgHtml = photo
      ? `<img src="${photo}" alt="${name}" class="table-thumb" onerror="this.src='/public/images/placeholder.svg'">`
      : `<div class="table-thumb d-flex align-items-center justify-content-center bg-light text-muted"><i class="bi bi-building fs-5"></i></div>`;

    return `
      <tr data-shop-id="${s.sid}">
        <td class="fw-semibold">#${s.sid}</td>
        <td>
          <div class="d-flex align-items-center gap-2">
            ${imgHtml}
            <div>
              <div class="fw-semibold text-dark">${name}</div>
              <div class="small text-muted"><i class="bi bi-clock me-1"></i>${hours}</div>
            </div>
          </div>
        </td>
        <td><span class="badge bg-light text-dark border px-2 py-1"><i class="bi bi-geo-alt-fill me-1 text-danger"></i>${city}</span></td>
        <td class="font-monospace text-muted small">${phone}</td>
        <td>${statusBadge}</td>
        <td class="small text-muted">
          ${(s.lat && s.long) ? `${s.lat.toFixed(2)}, ${s.long.toFixed(2)}` : '—'}
        </td>
        <td class="actions-cell">
          <div class="btn-group btn-group-sm">
            <a href="/shops/${s.sid}" class="btn btn-outline-secondary action-btn" title="View Details">
              <i class="bi bi-eye"></i>
            </a>
            <button type="button" class="btn btn-outline-primary action-btn" onclick="openEditShopModal(${s.sid})" title="Edit Shop">
              <i class="bi bi-pencil"></i>
            </button>
            <button type="button" class="btn btn-outline-danger action-btn" onclick="deleteShop(${s.sid}, '${name.replace(/'/g, "\\'")}')" title="Delete Shop">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterShops(query = '') {
  const term = query.toLowerCase().trim();
  const cityFilter = document.getElementById('shopCityFilter');
  const selectedCity = cityFilter ? cityFilter.value.toLowerCase() : '';

  const filtered = allShops.filter(s => {
    const shopName = (s.shopname || s.shopName || '').toLowerCase();
    const city = (s.city || '').toLowerCase();
    const phone = String(s.phone || '');

    const matchesSearch = !term || shopName.includes(term) || city.includes(term) || phone.includes(term);
    const matchesCity = !selectedCity || city === selectedCity;

    return matchesSearch && matchesCity;
  });

  renderShopsTable(filtered);
}

// Create Shop
async function handleCreateShop(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const spinner = form.querySelector('.spinner-border');

  const shopName = form.querySelector('[name="shopName"]').value.trim();
  const city = form.querySelector('[name="city"]').value.trim();
  const phone = form.querySelector('[name="phone"]').value.trim();

  if (!shopName || !city || !phone) {
    Notify.error('Shop Name, City, and Phone are required.', 'Validation Error');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  if (spinner) spinner.classList.remove('d-none');

  try {
    const formData = new FormData(form);
    const res = await apiRequest('/api/addShop', {
      method: 'POST',
      body: formData
    });

    if (res.ok && res.data.status) {
      Notify.toast('success', 'Service Center added successfully!');
      const modalEl = document.getElementById('createShopModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        form.reset();
        loadShops(1);
      } else {
        setTimeout(() => window.location.href = '/shops', 800);
      }
    } else {
      Notify.error(res.data.msg || 'Failed to add shop.');
    }
  } catch (error) {
    Notify.error('Error creating shop.');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (spinner) spinner.classList.add('d-none');
  }
}

// Open Edit Modal
function openEditShopModal(sid) {
  const shop = allShops.find(s => s.sid === sid);
  const modalEl = document.getElementById('editShopModal');
  if (!modalEl) {
    window.location.href = `/shops/${sid}/edit`;
    return;
  }

  const form = document.getElementById('editShopForm');
  form.reset();
  form.querySelector('[name="sid"]').value = sid;
  form.querySelector('[name="shopName"]').value = shop ? (shop.shopname || shop.shopName) : '';
  form.querySelector('[name="city"]').value = shop ? shop.city : '';
  form.querySelector('[name="phone"]').value = shop ? shop.phone : '';
  form.querySelector('[name="shopTime"]').value = shop ? (shop.shoptime || shop.shopTime) : '';
  form.querySelector('[name="lat"]').value = shop ? (shop.lat || '') : '';
  form.querySelector('[name="long"]').value = shop ? (shop.long || '') : '';
  form.querySelector('[name="status"]').value = (shop && (shop.status === true || shop.status === 'true')) ? 'true' : 'false';

  const imgPrev = document.getElementById('editShopPhotoPreview');
  const photo = shop ? (shop.shopphoto || shop.shopPhoto) : null;
  if (imgPrev) {
    imgPrev.src = photo ? getMediaUrl(photo) : '/public/images/placeholder.svg';
  }

  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

// Update Shop
async function handleUpdateShop(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const spinner = form.querySelector('.spinner-border');

  const sid = form.querySelector('[name="sid"]').value;

  if (!sid) {
    Notify.error('Shop ID is missing.', 'Validation Error');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  if (spinner) spinner.classList.remove('d-none');

  try {
    const formData = new FormData(form);
    const res = await apiRequest('/api/updateShop', {
      method: 'PATCH',
      body: formData
    });

    if (res.ok && res.data.status) {
      Notify.toast('success', 'Service Center updated successfully!');
      const modalEl = document.getElementById('editShopModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        loadShops(shopCurrentPage);
      } else {
        setTimeout(() => window.location.href = `/shops/${sid}`, 800);
      }
    } else {
      Notify.error(res.data.msg || 'Failed to update shop.');
    }
  } catch (error) {
    Notify.error('Error updating shop.');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (spinner) spinner.classList.add('d-none');
  }
}

// Delete Shop
async function deleteShop(sid, name) {
  const confirmed = await Notify.confirm(
    `Delete ${name}?`,
    `Are you sure you want to delete service center #${sid}?`
  );

  if (!confirmed) return;

  try {
    const res = await apiRequest('/api/deleteShop', {
      method: 'POST',
      body: { sid }
    });

    if (res.ok && res.data.status) {
      Notify.toast('success', `Service Center "${name}" deleted.`);
      loadShops(shopCurrentPage);
    } else {
      Notify.error(res.data.msg || 'Failed to delete shop.');
    }
  } catch (error) {
    Notify.error('Could not delete shop.');
  }
}

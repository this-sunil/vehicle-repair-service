/**
 * Bookings Management Controller
 * Full CRUD operations against /api/bookingHistory, /api/bookAppointment, /api/updateBookHistory, /api/deleteBookHistory
 */

let allBookings = [];
let currentPage = 1;
let totalPages = 1;

document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('bookingsTableBody');
  if (tableBody) {
    loadBookings(1);
    loadUsersDropdown();
    loadServicesDropdown();
  }

  // Create Appointment Modal
  const createForm = document.getElementById('createBookingForm');
  if (createForm) {
    createForm.addEventListener('submit', handleCreateBooking);
  }

  // Edit Appointment Modal
  const editForm = document.getElementById('editBookingForm');
  if (editForm) {
    editForm.addEventListener('submit', handleUpdateBooking);
  }

  // Standalone create page form
  const standaloneCreate = document.getElementById('standaloneCreateBookingForm');
  if (standaloneCreate) {
    loadUsersDropdown('standaloneBookingUidSelect');
    loadServicesDropdown('standaloneBookingServiceSelect');
    standaloneCreate.addEventListener('submit', handleCreateBooking);
  }

  // Standalone edit page form
  const standaloneEdit = document.getElementById('standaloneEditBookingForm');
  if (standaloneEdit) {
    loadServicesDropdown('standaloneEditServiceSelect');
    standaloneEdit.addEventListener('submit', handleUpdateBooking);
  }

  // Search input
  const searchInput = document.getElementById('bookingSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      filterBookings(searchInput.value);
    });
  }

  // Vehicle Type filter
  const typeFilter = document.getElementById('bookingTypeFilter');
  if (typeFilter) {
    typeFilter.addEventListener('change', () => {
      filterBookings(searchInput ? searchInput.value : '');
    });
  }
});

async function loadBookings(page = 1) {
  const tbody = document.getElementById('bookingsTableBody');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="text-center py-4 text-muted">
        <div class="spinner-border spinner-border-sm me-2 text-primary"></div>
        Loading service appointments...
      </td>
    </tr>
  `;

  try {
    const res = await apiRequest('/api/bookingHistory', {
      method: 'POST',
      body: { uid: 'all', page, limit: 100 }
    });

    if (res.ok && res.data.result) {
      allBookings = res.data.result;
      currentPage = res.data.currentPage || page;
      totalPages = res.data.totalPage || 1;
      renderBookingsTable(allBookings);
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center py-4 text-muted">
            <i class="bi bi-calendar-x fs-2 d-block mb-2"></i>
            ${res.data.msg || 'No bookings found.'}
          </td>
        </tr>
      `;
    }
  } catch (error) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-4 text-danger">
          <i class="bi bi-exclamation-triangle fs-2 d-block mb-2"></i>
          Failed to load bookings.
        </td>
      </tr>
    `;
  }
}

function renderBookingsTable(bookings) {
  const tbody = document.getElementById('bookingsTableBody');
  const countSpan = document.getElementById('bookingsCountSpan');
  if (countSpan) countSpan.textContent = bookings.length;
  if (!tbody) return;

  if (bookings.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-5 text-muted">
          <div class="empty-state">
            <div class="empty-state-icon"><i class="bi bi-calendar-check"></i></div>
            <div class="empty-state-title">No appointments found</div>
            <p class="empty-state-text">Book your first vehicle repair or maintenance appointment.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = bookings.map(b => {
    const vehName = escapeHtml(b.vehicle_name || 'Vehicle');
    const regNo = escapeHtml(b.registration_no || '—');
    const type = escapeHtml(b.vehicle_type || 'Car');
    const service = escapeHtml(b.service_name || 'General Service');
    const custName = escapeHtml(b.user_name || `User #${b.uid}`);
    const custPhone = escapeHtml(b.user_phone ? String(b.user_phone) : '');
    const slot = `${escapeHtml(b.slot_date || '')} ${escapeHtml(b.slot_time || '')}`.trim() || '—';
    const photo = b.vehicle_photo ? getMediaUrl(b.vehicle_photo) : null;

    const imgHtml = photo
      ? `<img src="${photo}" alt="${vehName}" class="table-thumb" onerror="this.src='/public/images/placeholder.svg'">`
      : `<div class="table-thumb d-flex align-items-center justify-content-center bg-light text-muted"><i class="bi bi-car-front fs-5"></i></div>`;

    return `
      <tr data-booking-id="${b.book_id}">
        <td class="fw-semibold">#${b.book_id}</td>
        <td>
          <div class="d-flex align-items-center gap-2">
            ${imgHtml}
            <div>
              <div class="fw-semibold text-dark">${vehName}</div>
              <div class="small text-muted font-monospace">${regNo}</div>
            </div>
          </div>
        </td>
        <td>
          <div class="fw-semibold">${custName}</div>
          <div class="small text-muted font-monospace">${custPhone}</div>
        </td>
        <td>
          <span class="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1">${service}</span>
        </td>
        <td>
          <span class="badge bg-light text-dark border">${type}</span>
        </td>
        <td>
          <div class="small fw-semibold text-dark"><i class="bi bi-calendar-event me-1 text-primary"></i>${escapeHtml(b.slot_date)}</div>
          <div class="small text-muted"><i class="bi bi-clock me-1"></i>${escapeHtml(b.slot_time)}</div>
        </td>
        <td class="actions-cell">
          <div class="btn-group btn-group-sm">
            <a href="/bookings/${b.book_id}" class="btn btn-outline-secondary action-btn" title="View Booking">
              <i class="bi bi-eye"></i>
            </a>
            <button type="button" class="btn btn-outline-primary action-btn" onclick="openEditBookingModal(${b.book_id})" title="Edit Booking">
              <i class="bi bi-pencil"></i>
            </button>
            <button type="button" class="btn btn-outline-danger action-btn" onclick="deleteBooking(${b.book_id}, '${vehName.replace(/'/g, "\\'")}')" title="Delete Booking">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterBookings(query = '') {
  const term = query.toLowerCase().trim();
  const typeFilter = document.getElementById('bookingTypeFilter');
  const selectedType = typeFilter ? typeFilter.value.toLowerCase() : '';

  const filtered = allBookings.filter(b => {
    const matchesSearch = !term ||
      (b.vehicle_name && b.vehicle_name.toLowerCase().includes(term)) ||
      (b.registration_no && b.registration_no.toLowerCase().includes(term)) ||
      (b.service_name && b.service_name.toLowerCase().includes(term)) ||
      (b.user_name && b.user_name.toLowerCase().includes(term)) ||
      String(b.book_id).includes(term);

    const matchesType = !selectedType || (b.vehicle_type && b.vehicle_type.toLowerCase() === selectedType);

    return matchesSearch && matchesType;
  });

  renderBookingsTable(filtered);
}

// Populate users select dropdown
async function loadUsersDropdown(targetId = 'bookingUidSelect') {
  const select = document.getElementById(targetId);
  if (!select) return;

  try {
    const res = await apiRequest('/api/getAllUser');
    if (res.ok && res.data.result) {
      select.innerHTML = '<option value="" disabled selected>Choose customer account...</option>' +
        res.data.result.map(u => `<option value="${u.id}">${escapeHtml(u.name)} (${u.phone || 'ID #' + u.id})</option>`).join('');
    }
  } catch (e) {}
}

// Populate services select dropdown
async function loadServicesDropdown(targetId = 'bookingServiceSelect') {
  const select = document.getElementById(targetId);
  if (!select) return;

  try {
    const res = await apiRequest('/api/getAllService', { method: 'POST', body: { page: 1, limit: 50 } });
    if (res.ok && res.data.result) {
      select.innerHTML = '<option value="" disabled selected>Choose requested service...</option>' +
        res.data.result.map(s => `<option value="${escapeHtml(s.title)}">${escapeHtml(s.title)}</option>`).join('');
    }
  } catch (e) {}
}

// Create Appointment
async function handleCreateBooking(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const spinner = form.querySelector('.spinner-border');

  const id = form.querySelector('[name="id"]').value;
  const vehicle_name = form.querySelector('[name="vehicle_name"]').value.trim();
  const registration_no = form.querySelector('[name="registration_no"]').value.trim();
  const vehicle_type = form.querySelector('[name="vehicle_type"]').value.trim();
  const slot_date = form.querySelector('[name="slot_date"]').value.trim();
  const slot_time = form.querySelector('[name="slot_time"]').value.trim();
  const service_name = form.querySelector('[name="service_name"]').value.trim();

  if (!id || !vehicle_name || !registration_no || !vehicle_type || !slot_date || !slot_time || !service_name) {
    Notify.error('All appointment fields are required.', 'Missing Fields');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  if (spinner) spinner.classList.remove('d-none');

  try {
    const formData = new FormData(form);
    const res = await apiRequest('/api/bookAppointment', {
      method: 'POST',
      body: formData
    });

    if (res.ok && res.data.status) {
      Notify.toast('success', 'Appointment booked successfully!');
      const modalEl = document.getElementById('createBookingModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        form.reset();
        loadBookings(1);
      } else {
        setTimeout(() => window.location.href = '/bookings', 800);
      }
    } else {
      Notify.error(res.data.msg || 'Failed to book appointment.');
    }
  } catch (error) {
    Notify.error('Error creating booking.');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (spinner) spinner.classList.add('d-none');
  }
}

// Open Edit Modal
function openEditBookingModal(book_id) {
  const booking = allBookings.find(b => b.book_id === book_id);
  const modalEl = document.getElementById('editBookingModal');
  if (!modalEl) {
    window.location.href = `/bookings/${book_id}/edit`;
    return;
  }

  const form = document.getElementById('editBookingForm');
  form.reset();
  form.querySelector('[name="book_id"]').value = book_id;
  form.querySelector('[name="vehicle_name"]').value = booking ? booking.vehicle_name : '';
  form.querySelector('[name="registration_no"]').value = booking ? booking.registration_no : '';
  form.querySelector('[name="vehicle_type"]').value = booking ? booking.vehicle_type : 'Car';
  form.querySelector('[name="slot_date"]').value = booking ? booking.slot_date : '';
  form.querySelector('[name="slot_time"]').value = booking ? booking.slot_time : '';
  form.querySelector('[name="service_name"]').value = booking ? booking.service_name : '';

  const imgPrev = document.getElementById('editBookingPhotoPreview');
  if (imgPrev) {
    imgPrev.src = booking && booking.vehicle_photo ? getMediaUrl(booking.vehicle_photo) : '/public/images/placeholder.svg';
  }

  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

// Update Appointment
async function handleUpdateBooking(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const spinner = form.querySelector('.spinner-border');

  const book_id = form.querySelector('[name="book_id"]').value;

  if (!book_id) {
    Notify.error('Booking ID is missing.', 'Error');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  if (spinner) spinner.classList.remove('d-none');

  try {
    const formData = new FormData(form);
    const res = await apiRequest('/api/updateBookHistory', {
      method: 'PATCH',
      body: formData
    });

    if (res.ok && res.data.status) {
      Notify.toast('success', 'Appointment updated successfully!');
      const modalEl = document.getElementById('editBookingModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        loadBookings(currentPage);
      } else {
        setTimeout(() => window.location.href = `/bookings/${book_id}`, 800);
      }
    } else {
      Notify.error(res.data.msg || 'Failed to update booking.');
    }
  } catch (error) {
    Notify.error('Error updating booking.');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (spinner) spinner.classList.add('d-none');
  }
}

// Delete Appointment
async function deleteBooking(book_id, vehicleName) {
  const confirmed = await Notify.confirm(
    `Cancel Appointment #${book_id}?`,
    `Are you sure you want to delete appointment for ${vehicleName}?`
  );

  if (!confirmed) return;

  try {
    const res = await apiRequest('/api/deleteBookHistory', {
      method: 'DELETE',
      body: { book_id }
    });

    if (res.ok && res.data.status) {
      Notify.toast('success', `Appointment #${book_id} cancelled and deleted.`);
      loadBookings(currentPage);
    } else {
      Notify.error(res.data.msg || 'Failed to delete booking.');
    }
  } catch (error) {
    Notify.error('Could not cancel booking.');
  }
}

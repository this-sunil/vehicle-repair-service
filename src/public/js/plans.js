/**
 * Subscription Plans Controller
 * Full CRUD operations against /api/fetchPlan, /api/addPlan, /api/updatePlan, /api/deletePlan
 */

let allPlans = [];

document.addEventListener('DOMContentLoaded', () => {
  const tableBody = document.getElementById('plansTableBody');
  if (tableBody) {
    loadPlans();
  }

  // Create Plan Modal
  const createForm = document.getElementById('createPlanForm');
  if (createForm) {
    createForm.addEventListener('submit', handleCreatePlan);
  }

  // Edit Plan Modal
  const editForm = document.getElementById('editPlanForm');
  if (editForm) {
    editForm.addEventListener('submit', handleUpdatePlan);
  }

  // Standalone create page form
  const standaloneCreate = document.getElementById('standaloneCreatePlanForm');
  if (standaloneCreate) {
    standaloneCreate.addEventListener('submit', handleCreatePlan);
  }

  // Standalone edit page form
  const standaloneEdit = document.getElementById('standaloneEditPlanForm');
  if (standaloneEdit) {
    standaloneEdit.addEventListener('submit', handleUpdatePlan);
  }

  // Search input
  const searchInput = document.getElementById('planSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      filterPlans(searchInput.value);
    });
  }
});

async function loadPlans() {
  const tbody = document.getElementById('plansTableBody');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="text-center py-4 text-muted">
        <div class="spinner-border spinner-border-sm me-2 text-primary"></div>
        Loading subscription packages...
      </td>
    </tr>
  `;

  try {
    const res = await apiRequest('/api/fetchPlan', {
      method: 'POST',
      body: {}
    });

    if (res.ok && res.data.result) {
      allPlans = res.data.result;
      renderPlansTable(allPlans);
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-4 text-muted">
            <i class="bi bi-card-checklist fs-2 d-block mb-2"></i>
            ${res.data.msg || 'No subscription plans found.'}
          </td>
        </tr>
      `;
    }
  } catch (error) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-4 text-danger">
          <i class="bi bi-exclamation-triangle fs-2 d-block mb-2"></i>
          Failed to load subscription plans.
        </td>
      </tr>
    `;
  }
}

function renderPlansTable(plans) {
  const tbody = document.getElementById('plansTableBody');
  const countSpan = document.getElementById('plansCountSpan');
  if (countSpan) countSpan.textContent = plans.length;
  if (!tbody) return;

  if (plans.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center py-5 text-muted">
          <div class="empty-state">
            <div class="empty-state-icon"><i class="bi bi-card-checklist"></i></div>
            <div class="empty-state-title">No plans configured</div>
            <p class="empty-state-text">Create membership tiers or periodic maintenance packages for customers.</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = plans.map(p => {
    const title = escapeHtml(p.plan_title || 'Package');
    const type = escapeHtml(p.plan_type || 'Monthly');
    const price = formatCurrency(p.plan_price);
    const created = formatDate(p.created_at);

    return `
      <tr data-plan-id="${p.pid}">
        <td class="fw-semibold">#${p.pid}</td>
        <td>
          <div class="d-flex align-items-center gap-2">
            <div class="stat-icon primary" style="width: 38px; height: 38px; font-size: 1.1rem; border-radius: 8px;">
              <i class="bi bi-patch-check"></i>
            </div>
            <div>
              <div class="fw-semibold text-dark">${title}</div>
              <div class="small text-muted">Billing Cycle: ${type}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge bg-light text-primary border px-2 py-1">${type}</span>
        </td>
        <td>
          <span class="fw-bold fs-6 text-dark">${price}</span>
        </td>
        <td class="actions-cell">
          <div class="btn-group btn-group-sm">
            <a href="/plans/${p.pid}" class="btn btn-outline-secondary action-btn" title="View Details">
              <i class="bi bi-eye"></i>
            </a>
            <button type="button" class="btn btn-outline-primary action-btn" onclick="openEditPlanModal(${p.pid})" title="Edit Plan">
              <i class="bi bi-pencil"></i>
            </button>
            <button type="button" class="btn btn-outline-danger action-btn" onclick="deletePlan(${p.pid}, '${title.replace(/'/g, "\\'")}')" title="Delete Plan">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterPlans(query = '') {
  const term = query.toLowerCase().trim();
  const filtered = allPlans.filter(p => {
    return !term ||
      (p.plan_title && p.plan_title.toLowerCase().includes(term)) ||
      (p.plan_type && p.plan_type.toLowerCase().includes(term)) ||
      String(p.pid).includes(term) ||
      String(p.plan_price).includes(term);
  });
  renderPlansTable(filtered);
}

// Create Plan
async function handleCreatePlan(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const spinner = form.querySelector('.spinner-border');

  const plan_title = form.querySelector('[name="plan_title"]').value.trim();
  const plan_type = form.querySelector('[name="plan_type"]').value.trim();
  const plan_price = form.querySelector('[name="plan_price"]').value.trim();

  if (!plan_title || !plan_type || !plan_price) {
    Notify.error('Plan title, billing cycle, and price are required.', 'Validation Error');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  if (spinner) spinner.classList.remove('d-none');

  try {
    const res = await apiRequest('/api/addPlan', {
      method: 'POST',
      body: {
        plan_title,
        plan_type,
        plan_price: Number(plan_price)
      }
    });

    if (res.ok && res.data.status) {
      Notify.toast('success', 'Subscription plan created successfully!');
      const modalEl = document.getElementById('createPlanModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        form.reset();
        loadPlans();
      } else {
        setTimeout(() => window.location.href = '/plans', 800);
      }
    } else {
      Notify.error(res.data.msg || 'Failed to create plan.');
    }
  } catch (error) {
    Notify.error('Error creating plan.');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (spinner) spinner.classList.add('d-none');
  }
}

// Open Edit Modal
function openEditPlanModal(pid) {
  const plan = allPlans.find(p => p.pid === pid);
  const modalEl = document.getElementById('editPlanModal');
  if (!modalEl) {
    window.location.href = `/plans/${pid}/edit`;
    return;
  }

  const form = document.getElementById('editPlanForm');
  form.reset();
  form.querySelector('[name="pid"]').value = pid;
  form.querySelector('[name="plan_title"]').value = plan ? plan.plan_title : '';
  form.querySelector('[name="plan_type"]').value = plan ? plan.plan_type : 'Monthly';
  form.querySelector('[name="plan_price"]').value = plan ? plan.plan_price : '';

  const modal = new bootstrap.Modal(modalEl);
  modal.show();
}

// Update Plan
async function handleUpdatePlan(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const spinner = form.querySelector('.spinner-border');

  const pid = form.querySelector('[name="pid"]').value;
  const plan_title = form.querySelector('[name="plan_title"]').value.trim();
  const plan_type = form.querySelector('[name="plan_type"]').value.trim();
  const plan_price = form.querySelector('[name="plan_price"]').value.trim();

  if (!pid || !plan_title || !plan_type || !plan_price) {
    Notify.error('All fields are required.', 'Validation Error');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  if (spinner) spinner.classList.remove('d-none');

  try {
    const res = await apiRequest('/api/updatePlan', {
      method: 'PATCH',
      body: {
        pid: Number(pid),
        plan_title,
        plan_type,
        plan_price: Number(plan_price)
      }
    });

    if (res.ok && res.data.status) {
      Notify.toast('success', 'Plan updated successfully!');
      const modalEl = document.getElementById('editPlanModal');
      if (modalEl) {
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
        loadPlans();
      } else {
        setTimeout(() => window.location.href = `/plans/${pid}`, 800);
      }
    } else {
      Notify.error(res.data.msg || 'Failed to update plan.');
    }
  } catch (error) {
    Notify.error('Error updating plan.');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (spinner) spinner.classList.add('d-none');
  }
}

// Delete Plan
async function deletePlan(pid, title) {
  const confirmed = await Notify.confirm(
    `Delete ${title}?`,
    `Are you sure you want to delete subscription plan #${pid}?`
  );

  if (!confirmed) return;

  try {
    const res = await apiRequest('/api/deletePlan', {
      method: 'POST',
      body: { pid }
    });

    if (res.ok && res.data.status) {
      Notify.toast('success', `Plan "${title}" deleted.`);
      loadPlans();
    } else {
      Notify.error(res.data.msg || 'Failed to delete plan.');
    }
  } catch (error) {
    Notify.error('Could not delete plan.');
  }
}

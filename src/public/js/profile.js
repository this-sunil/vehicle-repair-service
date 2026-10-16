/**
 * Admin Profile Controller
 * Profile fetching, profile update, and password modification
 */

document.addEventListener('DOMContentLoaded', () => {
  loadAdminProfile();

  const profileForm = document.getElementById('adminProfileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', handleUpdateProfile);
  }

  const passForm = document.getElementById('adminPasswordForm');
  if (passForm) {
    passForm.addEventListener('submit', handleChangePassword);
  }
});

async function loadAdminProfile() {
  const user = Auth.getUser() || { id: 1 };
  const userId = user.id || 1;

  try {
    const res = await apiRequest('/api/getProfile', {
      method: 'POST',
      body: { id: userId }
    });

    if (res.ok && res.data.result) {
      const u = res.data.result;
      // Update stored user
      Auth.setUser(u);

      document.getElementById('profileIdInput').value = u.id;
      document.getElementById('profileNameInput').value = u.name || '';
      document.getElementById('profilePhoneInput').value = u.phone || '';
      document.getElementById('passPhoneInput').value = u.phone || '';

      document.getElementById('profileDisplayName').textContent = u.name || 'Admin';
      document.getElementById('profileDisplayRole').textContent = u.role || 'admin';
      document.getElementById('profileDisplayPhone').textContent = u.phone ? String(u.phone) : '—';
      document.getElementById('profileDisplayCreated').textContent = formatDate(u.created_at);

      if (u.photo) {
        document.querySelectorAll('.profileAvatarPreview').forEach(el => {
          el.src = getMediaUrl(u.photo);
        });
      }
    }
  } catch (error) {
    console.error('Error loading admin profile:', error);
  }
}

async function handleUpdateProfile(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const spinner = form.querySelector('.spinner-border');

  const name = form.querySelector('[name="name"]').value.trim();
  const phone = form.querySelector('[name="phone"]').value.trim();

  if (!name || !phone) {
    Notify.error('Name and Phone are required.', 'Validation Error');
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
      Notify.success('Profile details updated successfully!');
      if (res.data.result) {
        Auth.setUser(res.data.result);
      }
      loadAdminProfile();
    } else {
      Notify.error(res.data.msg || 'Failed to update profile.');
    }
  } catch (error) {
    Notify.error('Error updating profile.');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (spinner) spinner.classList.add('d-none');
  }
}

async function handleChangePassword(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const spinner = form.querySelector('.spinner-border');

  const phone = form.querySelector('[name="phone"]').value.trim();
  const current_pass = form.querySelector('[name="current_pass"]').value.trim();
  const confirm_pass = form.querySelector('[name="confirm_pass"]').value.trim();

  if (!current_pass || !confirm_pass) {
    Notify.error('Please enter both password fields.', 'Validation Error');
    return;
  }

  if (current_pass !== confirm_pass) {
    Notify.error('New password and confirmation do not match.', 'Password Mismatch');
    return;
  }

  if (submitBtn) submitBtn.disabled = true;
  if (spinner) spinner.classList.remove('d-none');

  try {
    const res = await apiRequest('/api/changePass', {
      method: 'POST',
      body: { phone, current_pass }
    });

    if (res.ok && res.data.status) {
      Notify.success('Password changed successfully! You can sign in with your new password.');
      form.reset();
      form.querySelector('[name="phone"]').value = phone;
    } else {
      Notify.error(res.data.msg || 'Failed to change password.');
    }
  } catch (error) {
    Notify.error('Error changing password.');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (spinner) spinner.classList.add('d-none');
  }
}

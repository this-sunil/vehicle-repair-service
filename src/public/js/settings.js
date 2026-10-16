/**
 * Application Settings Controller
 * Controls /api/fetchSetting, /api/updateSetting, /api/addSetting
 */

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();

  const form = document.getElementById('settingsForm');
  if (form) {
    form.addEventListener('submit', handleSaveSettings);
  }
});

async function loadSettings() {
  const user = Auth.getUser() || { id: 1 };
  const userId = user.id || 1;

  try {
    const res = await apiRequest('/api/fetchSetting', {
      method: 'POST',
      body: { id: userId }
    });

    if (res.ok && res.data.result) {
      const s = res.data.result;
      document.getElementById('settingsSidInput').value = s.sid || 1;
      document.getElementById('settingsContactUrlInput').value = s.contact_url || '/contact';
      document.getElementById('settingsTermsUrlInput').value = s.terms_condition_url || '/terms-condition';
      document.getElementById('settingsPrivacyUrlInput').value = s.privacy_policy_url || '/privacy';

      if (s.photo) {
        document.getElementById('settingsBannerPreview').src = getMediaUrl(s.photo);
      }
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

async function handleSaveSettings(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const spinner = form.querySelector('.spinner-border');

  const sid = form.querySelector('[name="sid"]').value;

  if (submitBtn) submitBtn.disabled = true;
  if (spinner) spinner.classList.remove('d-none');

  try {
    const formData = new FormData(form);
    const res = await apiRequest('/api/updateSetting', {
      method: 'PATCH',
      body: formData
    });

    if (res.ok && res.data.status) {
      Notify.success('Application settings updated successfully!');
      loadSettings();
    } else {
      Notify.error(res.data.msg || 'Failed to update settings.');
    }
  } catch (error) {
    Notify.error('Error updating settings.');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
    if (spinner) spinner.classList.add('d-none');
  }
}

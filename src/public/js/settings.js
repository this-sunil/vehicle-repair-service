/* Settings — load & save platform links */
(function () {
  "use strict";
  const { escapeHtml } = VS.utils;
  const user = VS.session.user || {};

  document.addEventListener("DOMContentLoaded", async () => {
    /* Engine status */
    const r0 = await VS.api("/api/ai/insights");
    const status = document.getElementById("engine-status");
    if (status && r0.ok && r0.data) {
      status.textContent = r0.data.engine === "gemini" ? "Gemini AI connected ✨" : "Built-in smart analytics";
      status.className = r0.data.engine === "gemini" ? "badge-blue mt-3" : "badge-slate mt-3";
    }

    if (!user.id) return;
    const r = await VS.api("/api/fetchSetting", { method: "POST", body: { id: Number(user.id) } });
    if (r.ok && r.data && r.data.status && r.data.result) {
      const s = r.data.result;
      if (s.contact_url) document.getElementById("contact_url").value = s.contact_url;
      if (s.privacy_policy_url) document.getElementById("privacy_policy_url").value = s.privacy_policy_url;
      if (s.terms_condition_url) document.getElementById("terms_condition_url").value = s.terms_condition_url;
      if (s.photo && /^https?:/.test(s.photo))
        document.getElementById("settings-photo-preview").innerHTML =
          '<img src="' + escapeHtml(s.photo) + '" class="h-16 w-16 rounded-2xl object-cover">';
    }

    const photoInput = document.getElementById("photo");
    photoInput.addEventListener("change", () => {
      const f = photoInput.files[0];
      if (f)
        document.getElementById("settings-photo-preview").innerHTML =
          '<img src="' + URL.createObjectURL(f) + '" class="h-16 w-16 rounded-2xl object-cover">';
    });

    document.getElementById("settings-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const val = (id) => document.getElementById(id).value.trim();
      const allEmpty = !val("contact_url") && !val("privacy_policy_url") && !val("terms_condition_url") && !photoInput.files[0];

      const fd = new FormData();
      fd.append("contact_url", val("contact_url"));
      fd.append("privacy_policy_url", val("privacy_policy_url"));
      fd.append("terms_condition_url", val("terms_condition_url"));
      const photo = photoInput.files[0];
      if (photo) fd.append("photo", photo);

      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;

      /* No dedicated "upsert" — try update, fall back to create */
      let res = await VS.api("/api/updateSetting", { method: "PATCH", body: fd, multipart: true });
      if (!(res.ok && res.data && res.data.status)) {
        res = await VS.api("/api/addSetting", { method: "POST", body: fd, multipart: true });
      }
      btn.disabled = false;

      if (res.ok && res.data && res.data.status) VS.toast("Settings saved ✅", "success");
      else if (allEmpty) VS.toast("Nothing to save", "warning");
      else VS.toast((res.data && res.data.msg) || "Failed to save settings", "error");
    });
  });
})();

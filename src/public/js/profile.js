/* Admin profile — view, edit, change password */
(function () {
  "use strict";
  const { escapeHtml, fmtDate } = VS.utils;

  const user = VS.session.user || {};

  const render = (u) => {
    if (u.photo && /^https?:|^\/upload/.test(u.photo)) {
      const el = document.getElementById("pf-avatar");
      el.outerHTML = '<img id="pf-avatar" src="' + escapeHtml(u.photo) + '" class="h-28 w-28 rounded-3xl object-cover shadow-xl ring-4 ring-white dark:ring-slate-900" alt="">';
      document.getElementById("pf-photo-preview").innerHTML = '<img src="' + escapeHtml(u.photo) + '" class="h-16 w-16 rounded-2xl object-cover">';
    } else {
      document.getElementById("pf-avatar").textContent = VS.utils.initials(u.name);
    }
    document.getElementById("pf-name").textContent = u.name || "Administrator";
    const role = document.getElementById("pf-role");
    role.textContent = u.role || "user";
    role.className = (u.role === "admin" ? "badge-blue" : "badge-green") + " mt-1.5 capitalize";
    document.getElementById("pf-phone").textContent = u.phone || "—";
    document.getElementById("pf-joined").textContent = fmtDate(u.created_at);
    document.getElementById("pf-name-input").value = u.name || "";
    document.getElementById("pf-phone-input").value = u.phone || "";
  };

  document.addEventListener("DOMContentLoaded", async () => {
    if (!user.id) return;
    render(user);

    /* Keep fresh from server */
    const r = await VS.api("/api/getProfile", { method: "POST", body: { id: Number(user.id) } });
    if (r.ok && r.data && r.data.status) {
      VS.session.set(r.data.token || VS.session.token, r.data.result);
      render(r.data.result);
    }

    const photoInput = document.getElementById("pf-photo");
    photoInput.addEventListener("change", () => {
      const f = photoInput.files[0];
      if (f) {
        document.getElementById("pf-photo-preview").innerHTML =
          '<img src="' + URL.createObjectURL(f) + '" class="h-16 w-16 rounded-2xl object-cover">';
      }
    });

    /* Profile form */
    document.getElementById("pf-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("pf-name-input").value.trim();
      const phone = document.getElementById("pf-phone-input").value.replace(/\s+/g, "");
      const err = (f, m) => {
        const el = document.querySelector('[data-error-for="' + f + '"]');
        if (el) { el.textContent = m; el.classList.remove("hidden"); }
        document.getElementById(f).classList.add("input-error");
      };
      ["pf-name-input", "pf-phone-input"].forEach((f) => {
        const el = document.querySelector('[data-error-for="' + f + '"]');
        if (el) { el.textContent = ""; el.classList.add("hidden"); }
        document.getElementById(f).classList.remove("input-error");
      });
      if (name.length < 2) { err("pf-name-input", "Enter a valid name"); return; }
      if (!/^\d{6,15}$/.test(phone)) { err("pf-phone-input", "Enter a valid phone number"); return; }

      const fd = new FormData();
      fd.append("id", Number(user.id));
      fd.append("name", name);
      fd.append("phone", phone);
      const photo = photoInput.files[0];
      if (photo) fd.append("photo", photo);

      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      const res = await VS.api("/api/updateProfile", { method: "POST", body: fd, multipart: true });
      btn.disabled = false;
      if (res.ok && res.data && res.data.status) {
        VS.session.set(res.data.token || VS.session.token, res.data.result || user);
        VS.toast("Profile saved ✅", "success");
        setTimeout(() => window.location.reload(), 800);
      } else VS.toast((res.data && res.data.msg) || "Update failed", "error");
    });

    /* Password form */
    document.getElementById("pf-pass-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const current = document.getElementById("pf-current").value;
      const next = document.getElementById("pf-new").value;
      const err = (f, m) => {
        const el = document.querySelector('[data-error-for="' + f + '"]');
        if (el) { el.textContent = m; el.classList.remove("hidden"); }
        document.getElementById(f).classList.add("input-error");
      };
      ["pf-current", "pf-new"].forEach((f) => {
        const el = document.querySelector('[data-error-for="' + f + '"]');
        if (el) { el.textContent = ""; el.classList.add("hidden"); }
        document.getElementById(f).classList.remove("input-error");
      });
      if (!current) { err("pf-current", "Enter your current password"); return; }
      if (next.length < 6) { err("pf-new", "Use at least 6 characters"); return; }

      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      const res = await VS.api("/api/forgotPass", {
        method: "POST",
        body: { phone: String(user.phone), old_pass: current, current_pass: next },
        auth: false,
      });
      btn.disabled = false;
      if (res.ok && res.data && res.data.status) {
        VS.toast("Password updated 🔐", "success");
        document.getElementById("pf-pass-form").reset();
      } else VS.toast((res.data && res.data.msg) || "Password change failed", "error");
    });
  });
})();

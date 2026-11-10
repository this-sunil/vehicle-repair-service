/* Users module — list, create, show, edit */
(function () {
  "use strict";
  const { escapeHtml, fmtDate, timeAgo, avatar, emptyRow, debounce } = VS.utils;
  const page = document.body.dataset.page;

  /* =======================  INDEX  ======================= */
  if (page === "users") {
    let allUsers = [];
    let filtered = [];
    let pageNo = 1;
    let selected = new Set();
    const PER = 10;

    const applyFilters = () => {
      const q = (document.getElementById("user-search").value || "").toLowerCase().trim();
      const role = document.getElementById("user-role").value;
      filtered = allUsers.filter(
        (u) =>
          (!role || u.role === role) &&
          (!q || String(u.name).toLowerCase().includes(q) || String(u.phone).includes(q) || String(u.id).includes(q))
      );
      render();
    };

    const updateBulkBar = () => {
      const bar = document.getElementById("user-bulkbar");
      document.getElementById("user-bulk-count").textContent = selected.size;
      bar.classList.toggle("hidden", selected.size === 0);
      bar.classList.toggle("flex", selected.size > 0);
    };

    const render = () => {
      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / PER));
      pageNo = Math.min(pageNo, totalPages);
      const slice = filtered.slice((pageNo - 1) * PER, pageNo * PER);

      document.getElementById("stat-total").textContent = allUsers.length;
      document.getElementById("stat-customers").textContent = allUsers.filter((u) => u.role === "user").length;
      document.getElementById("stat-admins").textContent = allUsers.filter((u) => u.role === "admin").length;

      const tbody = document.getElementById("users-tbody");
      tbody.innerHTML = slice.length
        ? slice
            .map(
              (u) =>
                "<tr>" +
                '<td><input type="checkbox" class="vs-check vs-row-check" data-id="' + u.id + '"' + (selected.has(String(u.id)) ? " checked" : "") + ' aria-label="Select ' + escapeHtml(u.name) + '"></td>' +
                '<td><div class="flex items-center gap-3">' + avatar(u) +
                '<div><div class="text-sm font-semibold text-slate-800 dark:text-slate-100">' + escapeHtml(u.name) + "</div>" +
                '<div class="text-xs text-slate-400">#' + u.id + "</div></div></div></td>" +
                '<td class="font-mono text-xs font-semibold text-slate-500 dark:text-slate-300">' + escapeHtml(String(u.phone)) + "</td>" +
                "<td>" + (u.role === "admin" ? '<span class="badge-blue"><i class="bi bi-shield-check"></i> admin</span>' : '<span class="badge-green">customer</span>') + "</td>" +
                '<td class="text-xs text-slate-400">' + fmtDate(u.created_at) + " · " + timeAgo(u.created_at) + "</td>" +
                '<td><div class="flex justify-end gap-1.5">' +
                '<a href="/users/' + u.id + '" class="btn-secondary btn-sm" title="View"><i class="bi bi-eye"></i></a>' +
                '<a href="/users/' + u.id + '/edit" class="btn-secondary btn-sm" title="Edit"><i class="bi bi-pencil"></i></a>' +
                '<button class="btn-secondary btn-sm !text-rose-600 dark:!text-rose-400" data-del="' + u.id + '" title="Delete"><i class="bi bi-trash3"></i></button>' +
                "</div></td></tr>"
            )
            .join("")
        : emptyRow(6, "bi-people", "No users match your filters");

      VS.pagination({ page: pageNo, totalPages, total, onChange: (p) => { pageNo = p; render(); window.scrollTo({ top: 0, behavior: "smooth" }); } });

      // row checkbox events
      tbody.querySelectorAll(".vs-row-check").forEach((c) =>
        c.addEventListener("change", () => {
          if (c.checked) selected.add(c.dataset.id);
          else selected.delete(c.dataset.id);
          updateBulkBar();
        })
      );

      tbody.querySelectorAll("[data-del]").forEach((b) =>
        b.addEventListener("click", async () => {
          const u = allUsers.find((x) => String(x.id) === b.dataset.del);
          const yes = await VS.confirm({ title: "Delete user?", message: "This will permanently remove " + (u ? u.name : "this user") + " and their bookings.", confirmText: "Delete", danger: true });
          if (!yes) return;
          const r = await VS.api("/api/deleteUserById", { method: "DELETE", body: { id: Number(b.dataset.del) } });
          if (r.ok && r.data && r.data.status) { VS.toast("User deleted", "success"); load(); }
          else VS.toast((r.data && r.data.msg) || "Delete failed", "error");
        })
      );
      updateBulkBar();
    };

    // select-all (current page)
    document.getElementById("user-select-all").addEventListener("change", (e) => {
      const checked = e.target.checked;
      document.getElementById("users-tbody")
        .querySelectorAll(".vs-row-check")
        .forEach((c) => {
          c.checked = checked;
          if (checked) selected.add(c.dataset.id);
          else selected.delete(c.dataset.id);
        });
      updateBulkBar();
    });

    document.getElementById("user-bulk-cancel").addEventListener("click", () => {
      selected.clear();
      document.getElementById("user-select-all").checked = false;
      render();
    });

    document.getElementById("user-bulk-delete").addEventListener("click", async () => {
      const ids = [...selected];
      const yes = await VS.confirm({
        title: "Delete " + ids.length + " user" + (ids.length > 1 ? "s" : "") + "?",
        message: "This will permanently remove the selected users and all their bookings. This cannot be undone.",
        confirmText: "Delete " + ids.length,
        danger: true,
      });
      if (!yes) return;
      let ok = 0;
      for (const id of ids) {
        const r = await VS.api("/api/deleteUserById", { method: "DELETE", body: { id: Number(id) } });
        if (r.ok && r.data && r.data.status) ok++;
      }
      selected.clear();
      document.getElementById("user-select-all").checked = false;
      VS.toast("Deleted " + ok + " of " + ids.length + " users", ok === ids.length ? "success" : "warning");
      load();
    });

    const load = async () => {
      const r = await VS.api("/api/getAllUser");
      allUsers = r.ok && r.data && r.data.status ? r.data.result || [] : [];
      applyFilters();
    };

    document.getElementById("user-search").addEventListener("input", debounce(applyFilters, 200));
    document.getElementById("user-role").addEventListener("change", applyFilters);
    document.getElementById("user-refresh").addEventListener("click", () => { const i = document.getElementById("user-refresh").querySelector("i"); i.classList.add("animate-spin"); load().finally(() => i.classList.remove("animate-spin")); });
    document.getElementById("user-export").addEventListener("click", () => {
      if (!VS.utils.exportCSV("users.csv", ["id", "name", "phone", "role", "created_at"], filtered))
        VS.toast("Nothing to export", "warning");
      else VS.toast("Users exported ✅", "success");
    });

    load();
  }

  /* =======================  CREATE  ======================= */
  if (page === "users-create") {
    const form = document.getElementById("user-create-form");
    const setErr = (f, m) => {
      const el = document.querySelector('[data-error-for="' + f + '"]');
      if (el) { el.textContent = m || ""; el.classList.toggle("hidden", !m); }
      document.getElementById(f).classList.toggle("input-error", !!m);
    };

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("name").value.trim();
      const phone = document.getElementById("phone").value.replace(/\s+/g, "");
      const pass = document.getElementById("pass").value;
      let bad = false;
      setErr("name", ""); setErr("phone", ""); setErr("pass", "");
      if (name.length < 2) { setErr("name", "Enter a full name"); bad = true; }
      if (!/^\d{6,15}$/.test(phone)) { setErr("phone", "Enter a valid phone number"); bad = true; }
      if (pass.length < 6) { setErr("pass", "Minimum 6 characters"); bad = true; }
      if (bad) return;

      const btn = document.getElementById("user-create-btn");
      btn.disabled = true;
      const r = await VS.api("/api/register", { method: "POST", body: { name, phone, pass }, auth: true });
      btn.disabled = false;

      if (r.ok && r.data && r.data.status) {
        VS.toast("User registered successfully ✅", "success");
        setTimeout(() => (window.location.href = "/users"), 700);
      } else VS.toast((r.data && r.data.msg) || "Registration failed", "error");
    });
  }

  /* =======================  SHOW  ======================= */
  if (page === "users-show") {
    const id = document.body.dataset.id;
    const loadUser = async () => {
      const r = await VS.api("/api/getProfile", { method: "POST", body: { id: Number(id) } });
      if (!(r.ok && r.data && r.data.status)) {
        VS.toast((r.data && r.data.msg) || "User not found", "error");
        return;
      }
      const u = r.data.result;
      document.getElementById("u-avatar").outerHTML = avatar(u, "h-24 w-24 text-2xl !rounded-3xl ring-4 ring-white dark:ring-slate-900 shadow-xl");
      document.getElementById("u-name").textContent = u.name;
      const role = document.getElementById("u-role");
      role.textContent = u.role;
      role.className = (u.role === "admin" ? "badge-blue" : "badge-green") + " capitalize mt-1.5";
      document.getElementById("u-phone").textContent = u.phone;
      document.getElementById("u-joined").textContent = fmtDate(u.created_at);
      document.getElementById("u-id").textContent = "#" + u.id;
    };

    const loadBookings = async () => {
      const r = await VS.api("/api/bookingHistory", { method: "POST", body: { uid: Number(id), page: 1, limit: 50 } });
      const tbody = document.getElementById("u-bookings");
      const rows = r.ok && r.data && r.data.status ? r.data.result || [] : [];
      document.getElementById("u-booking-count").textContent = (r.data && r.data.totalItem) || rows.length;
      tbody.innerHTML = rows.length
        ? rows
            .map(
              (b) =>
                "<tr>" +
                '<td><div class="text-sm font-semibold text-slate-800 dark:text-slate-100">' + escapeHtml(b.vehicle_name) + "</div>" +
                '<div class="text-xs text-slate-400">' + escapeHtml(b.registration_no) + " · " + escapeHtml(b.vehicle_type) + "</div></td>" +
                '<td class="text-sm text-slate-600 dark:text-slate-300">' + escapeHtml(b.service_name) + "</td>" +
                '<td><div class="text-xs font-semibold text-slate-700 dark:text-slate-200">' + fmtDate(b.slot_date) + '</div><div class="text-xs text-slate-400">' + escapeHtml(b.slot_time || "") + "</div></td>" +
                '<td class="text-right"><a href="/bookings/' + b.book_id + '" class="btn-secondary btn-sm"><i class="bi bi-eye"></i></a></td></tr>'
            )
            .join("")
        : emptyRow(4, "bi-calendar-x", "No bookings for this user yet");
    };

    loadUser();
    loadBookings();
  }

  /* =======================  EDIT  ======================= */
  if (page === "users-edit") {
    const id = document.body.dataset.id;
    const form = document.getElementById("user-edit-form");
    const setErr = (f, m) => {
      const el = document.querySelector('[data-error-for="' + f + '"]');
      if (el) { el.textContent = m || ""; el.classList.toggle("hidden", !m); }
      document.getElementById(f).classList.toggle("input-error", !!m);
    };

    (async () => {
      const r = await VS.api("/api/getProfile", { method: "POST", body: { id: Number(id) } });
      if (r.ok && r.data && r.data.status) {
        document.getElementById("name").value = r.data.result.name || "";
        document.getElementById("phone").value = r.data.result.phone || "";
        if (r.data.result.photo && /^https?:/.test(r.data.result.photo))
          document.getElementById("photo-preview").innerHTML = '<img src="' + escapeHtml(r.data.result.photo) + '" class="h-16 w-16 rounded-2xl object-cover">';
      } else VS.toast((r.data && r.data.msg) || "Could not load user", "error");
    })();

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("name").value.trim();
      const phone = document.getElementById("phone").value.replace(/\s+/g, "");
      setErr("name", ""); setErr("phone", "");
      let bad = false;
      if (name.length < 2) { setErr("name", "Enter a full name"); bad = true; }
      if (!/^\d{6,15}$/.test(phone)) { setErr("phone", "Enter a valid phone number"); bad = true; }
      if (bad) return;

      const fd = new FormData();
      fd.append("id", id);
      fd.append("name", name);
      fd.append("phone", phone);
      const photo = document.getElementById("photo").files[0];
      if (photo) fd.append("photo", photo);

      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      const r = await VS.api("/api/updateProfile", { method: "POST", body: fd, multipart: true });
      btn.disabled = false;

      if (r.ok && r.data && r.data.status) {
        VS.toast("Profile updated ✅", "success");
        if (Number(id) === (VS.session.user && VS.session.user.id)) {
          VS.session.set(r.data.token || VS.session.token, r.data.result || VS.session.user);
        }
        setTimeout(() => (window.location.href = "/users"), 700);
      } else VS.toast((r.data && r.data.msg) || "Update failed", "error");
    });
  }
})();

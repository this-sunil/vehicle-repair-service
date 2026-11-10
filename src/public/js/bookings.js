/* Bookings module — list, create, show, edit */
(function () {
  "use strict";
  const { escapeHtml, fmtDate, timeAgo, avatar, emptyRow, debounce } = VS.utils;
  const page = document.body.dataset.page;

  const loadUsers = async () => {
    const r = await VS.api("/api/getAllUser");
    return r.ok && r.data && r.data.status ? r.data.result || [] : [];
  };

  const loadCategories = async () => {
    const r = await VS.api("/api/getAllCategory?page=1&limit=100");
    return r.ok && r.data && r.data.status ? r.data.result || [] : [];
  };

  const loadServices = async () => {
    const r = await VS.api("/api/getAllService", { method: "POST", body: { page: 1, limit: 100 } });
    return r.ok && r.data && r.data.status ? r.data.result || [] : [];
  };

  /* =======================  INDEX  ======================= */
  if (page === "bookings") {
    let all = [];
    let pageNo = 1;
    let selected = new Set();

    const updateBulkBar = () => {
      const bar = document.getElementById("bk-bulkbar");
      document.getElementById("bk-bulk-count").textContent = selected.size;
      bar.classList.toggle("hidden", selected.size === 0);
      bar.classList.toggle("flex", selected.size > 0);
    };

    const render = () => {
      const q = (document.getElementById("bk-search").value || "").toLowerCase().trim();
      const type = document.getElementById("bk-type").value;
      const rows = all.filter(
        (b) =>
          (!type || (b.vehicle_type || "").toLowerCase() === type.toLowerCase()) &&
          (!q ||
            [b.vehicle_name, b.registration_no, b.service_name, b.user_name, b.vehicle_type]
              .filter(Boolean)
              .some((v) => String(v).toLowerCase().includes(q)))
      );
      const totalPages = Math.max(1, Math.ceil(rows.length / 10));
      pageNo = Math.min(pageNo, totalPages);
      const slice = rows.slice((pageNo - 1) * 10, pageNo * 10);

      const tbody = document.getElementById("bk-tbody");
      tbody.innerHTML = slice.length
        ? slice
            .map(
              (b) => {
                const isToday = b.slot_date === new Date().toISOString().slice(0, 10);
                const isFuture = b.slot_date && b.slot_date >= new Date().toISOString().slice(0, 10);
                const pill = isToday
                  ? '<span class="badge-green">today</span>'
                  : isFuture
                  ? '<span class="badge-blue">upcoming</span>'
                  : '<span class="badge-slate">past</span>';
                return (
                  "<tr>" +
                  '<td><input type="checkbox" class="vs-check vs-row-check" data-id="' + b.book_id + '"' + (selected.has(String(b.book_id)) ? " checked" : "") + ' aria-label="Select booking"></td>' +
                  '<td><div class="flex items-center gap-3">' + avatar({ name: b.user_name, photo: null }) +
                  '<div><div class="text-sm font-semibold text-slate-800 dark:text-slate-100">' + escapeHtml(b.user_name || "Unknown") + "</div>" +
                  '<div class="text-xs text-slate-400">' + (b.user_phone ? escapeHtml(String(b.user_phone)) : "—") + "</div></div></div></td>" +
                  '<td><div class="text-sm font-semibold text-slate-800 dark:text-slate-100">' + escapeHtml(b.vehicle_name || "—") + "</div>" +
                  '<div class="font-mono text-xs text-slate-400">' + escapeHtml(b.registration_no || "—") + " · " + escapeHtml(b.vehicle_type || "") + "</div></td>" +
                  '<td class="text-sm text-slate-600 dark:text-slate-300">' + escapeHtml(b.service_name || "—") + "</td>" +
                  '<td><div class="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">' + fmtDate(b.slot_date) + " · " + escapeHtml(b.slot_time || "") + "</div>" + pill + "</td>" +
                  '<td><div class="flex justify-end gap-1.5">' +
                  '<a href="/bookings/' + b.book_id + '" class="btn-secondary btn-sm" title="View"><i class="bi bi-eye"></i></a>' +
                  '<a href="/bookings/' + b.book_id + '/edit" class="btn-secondary btn-sm" title="Reschedule"><i class="bi bi-pencil"></i></a>' +
                  '<button class="btn-secondary btn-sm !text-rose-600 dark:!text-rose-400" data-del="' + b.book_id + '" title="Delete"><i class="bi bi-trash3"></i></button>' +
                  "</div></td></tr>"
                );
              }
            )
            .join("")
        : emptyRow(6, "bi-calendar-x", "No bookings found");

      VS.pagination({ page: pageNo, totalPages, total: rows.length, onChange: (p) => { pageNo = p; render(); window.scrollTo({ top: 0, behavior: "smooth" }); } });

      tbody.querySelectorAll(".vs-row-check").forEach((c) =>
        c.addEventListener("change", () => {
          if (c.checked) selected.add(c.dataset.id);
          else selected.delete(c.dataset.id);
          updateBulkBar();
        })
      );

      tbody.querySelectorAll("[data-del]").forEach((btn) =>
        btn.addEventListener("click", async () => {
          const yes = await VS.confirm({ title: "Delete booking?", message: "This appointment will be permanently removed.", confirmText: "Delete", danger: true });
          if (!yes) return;
          const r = await VS.api("/api/deleteBookHistory", { method: "DELETE", body: { book_id: Number(btn.dataset.del) } });
          if (r.ok && r.data && r.data.status) { VS.toast("Booking deleted", "success"); load(); }
          else VS.toast((r.data && r.data.msg) || "Delete failed", "error");
        })
      );
      updateBulkBar();
    };

    document.getElementById("bk-select-all").addEventListener("change", (e) => {
      const checked = e.target.checked;
      document.getElementById("bk-tbody")
        .querySelectorAll(".vs-row-check")
        .forEach((c) => {
          c.checked = checked;
          if (checked) selected.add(c.dataset.id);
          else selected.delete(c.dataset.id);
        });
      updateBulkBar();
    });

    document.getElementById("bk-bulk-cancel").addEventListener("click", () => {
      selected.clear();
      document.getElementById("bk-select-all").checked = false;
      render();
    });

    document.getElementById("bk-bulk-delete").addEventListener("click", async () => {
      const ids = [...selected];
      const yes = await VS.confirm({
        title: "Delete " + ids.length + " booking" + (ids.length > 1 ? "s" : "") + "?",
        message: "The selected appointments will be permanently removed. This cannot be undone.",
        confirmText: "Delete " + ids.length,
        danger: true,
      });
      if (!yes) return;
      let ok = 0;
      for (const id of ids) {
        const r = await VS.api("/api/deleteBookHistory", { method: "DELETE", body: { book_id: Number(id) } });
        if (r.ok && r.data && r.data.status) ok++;
      }
      selected.clear();
      document.getElementById("bk-select-all").checked = false;
      VS.toast("Deleted " + ok + " of " + ids.length + " bookings", ok === ids.length ? "success" : "warning");
      load();
    });

    const load = async () => {
      const r = await VS.api("/api/bookingHistory", { method: "POST", body: { uid: "all", page: 1, limit: 500 } });
      all = r.ok && r.data && r.data.status ? r.data.result || [] : [];

      const sel = document.getElementById("bk-type");
      const types = [...new Set(all.map((b) => b.vehicle_type).filter(Boolean))];
      const cur = sel.value;
      sel.innerHTML = '<option value="">All vehicle types</option>' + types.map((t) => '<option value="' + escapeHtml(t) + '">' + escapeHtml(t) + "</option>").join("");
      sel.value = cur;
      render();
    };

    document.getElementById("bk-search").addEventListener("input", debounce(render, 200));
    document.getElementById("bk-type").addEventListener("change", render);
    document.getElementById("bk-refresh").addEventListener("click", () => { const i = document.querySelector("#bk-refresh i"); i.classList.add("animate-spin"); load().finally(() => i.classList.remove("animate-spin")); });
    document.getElementById("bk-export").addEventListener("click", () => {
      if (!VS.utils.exportCSV("bookings.csv",
        [{ key: "book_id", label: "id" }, "user_name", "user_phone", "vehicle_name", "registration_no", "vehicle_type", "service_name", "slot_date", "slot_time", "created_at"],
        all.filter((b) => b.visible !== false)))
        VS.toast("Nothing to export", "warning");
      else VS.toast("Bookings exported ✅", "success");
    });

    load();
  }

  /* =======================  CREATE  ======================= */
  if (page === "bookings-create") {
    const setErr = (f, m) => {
      const el = document.querySelector('[data-error-for="' + f + '"]');
      if (el) { el.textContent = m || ""; el.classList.toggle("hidden", !m); }
      document.getElementById(f).classList.toggle("input-error", !!m);
    };

    (async () => {
      const [users, cats, services] = await Promise.all([loadUsers(), loadCategories(), loadServices()]);
      const userSel = document.getElementById("bk-user");
      userSel.innerHTML = users.length
        ? '<option value="">Choose customer…</option>' +
          users.map((u) => '<option value="' + u.id + '">' + escapeHtml(u.name) + " · " + escapeHtml(String(u.phone)) + "</option>").join("")
        : '<option value="">No users — register one first</option>';

      const typeSel = document.getElementById("bk-vtype");
      typeSel.innerHTML = cats.length
        ? '<option value="">Choose type…</option>' + [...new Set(cats.map((c) => c.vehicle_type).filter(Boolean))].map((t) => '<option value="' + escapeHtml(t) + '">' + escapeHtml(t) + "</option>").join("")
        : '<option value="">Car</option><option value="">Bike</option>'.replace(/<option value="">Bike<\/option>/, "") + "<option>Car</option><option>Bike</option><option>Truck</option><option>Van</option>";

      const svcSel = document.getElementById("bk-service");
      svcSel.innerHTML = services.length
        ? '<option value="">Choose service…</option>' + services.map((s) => '<option value="' + escapeHtml(s.title) + '">' + escapeHtml(s.title) + "</option>").join("")
        : '<option value="">No services — add one first</option>';
    })();

    const photoInput = document.getElementById("bk-photo");
    photoInput.addEventListener("change", () => {
      const f = photoInput.files[0];
      const prev = document.getElementById("bk-photo-preview");
      if (f) { prev.classList.remove("hidden"); prev.querySelector("img").src = URL.createObjectURL(f); }
      else prev.classList.add("hidden");
    });

    const d = document.getElementById("bk-date");
    if (d) d.min = new Date().toISOString().slice(0, 10);

    document.getElementById("bk-create-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const user = document.getElementById("bk-user").value;
      const vname = document.getElementById("bk-vname").value.trim();
      const regno = document.getElementById("bk-regno").value.trim();
      const vtype = document.getElementById("bk-vtype").value;
      const service = document.getElementById("bk-service").value;
      const date = document.getElementById("bk-date").value;
      const time = document.getElementById("bk-time").value;
      let bad = false;
      ["bk-user", "bk-vname", "bk-regno", "bk-vtype", "bk-service", "bk-date", "bk-time"].forEach((f) => setErr(f, ""));
      if (!user) { setErr("bk-user", "Choose a customer"); bad = true; }
      if (!vname) { setErr("bk-vname", "Required"); bad = true; }
      if (!regno) { setErr("bk-regno", "Required"); bad = true; }
      if (!service) { setErr("bk-service", "Choose a service"); bad = true; }
      if (!date) { setErr("bk-date", "Pick a date"); bad = true; }
      if (!time) { setErr("bk-time", "Pick a time"); bad = true; }
      if (bad) return;

      const fd = new FormData();
      fd.append("id", user);
      fd.append("vehicle_name", vname);
      fd.append("registration_no", regno);
      fd.append("vehicle_type", vtype || "Other");
      fd.append("service_name", service);
      fd.append("slot_date", date);
      fd.append("slot_time", time);
      const photo = photoInput.files[0];
      if (photo) fd.append("vehicle_photo", photo);

      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      const r = await VS.api("/api/bookAppointment", { method: "POST", body: fd, multipart: true });
      btn.disabled = false;
      if (r.ok && r.data && r.data.status) { VS.toast("Appointment booked ✅", "success"); setTimeout(() => (window.location.href = "/bookings"), 700); }
      else VS.toast((r.data && r.data.msg) || "Booking failed", "error");
    });
  }

  /* =======================  SHOW  ======================= */
  if (page === "bookings-show") {
    const id = document.body.dataset.id;

    const findBooking = async () => {
      const r = await VS.api("/api/bookingHistory", { method: "POST", body: { uid: "all", page: 1, limit: 500 } });
      const rows = r.ok && r.data && r.data.status ? r.data.result || [] : [];
      return rows.find((b) => String(b.book_id) === String(id)) || null;
    };

    (async () => {
      const b = await findBooking();
      if (!b) {
        document.getElementById("bk-subtitle").textContent = "Booking not found";
        VS.toast("Booking not found", "error");
        return;
      }
      document.getElementById("bk-subtitle").textContent = b.vehicle_name + " · " + b.registration_no;
      document.title = b.vehicle_name + " | Vehicle Service Admin";
      const wrap = document.getElementById("bk-photo-wrap");
      if (b.vehicle_photo && /^https?:/.test(b.vehicle_photo)) wrap.innerHTML = '<img src="' + escapeHtml(b.vehicle_photo) + '" class="h-56 w-full object-cover" alt="vehicle">';
      document.getElementById("bk-vehicle").textContent = b.vehicle_name || "—";
      document.getElementById("bk-type").textContent = b.vehicle_type || "—";
      document.getElementById("bk-reg").textContent = b.registration_no || "—";
      document.getElementById("bk-customer").innerHTML = avatar({ name: b.user_name, photo: null }, "h-8 w-8") + '<span>' + escapeHtml(b.user_name || "Unknown") + "</span>";
      document.getElementById("bk-phone").textContent = b.user_phone || "—";
      document.getElementById("bk-service").textContent = b.service_name || "—";
      document.getElementById("bk-slot").textContent = fmtDate(b.slot_date) + " · " + (b.slot_time || "");
      document.getElementById("bk-created").textContent = fmtDate(b.created_at) + " (" + timeAgo(b.created_at) + ")";
      document.getElementById("bk-edit-link").href = "/bookings/" + id + "/edit";

      document.getElementById("bk-del").addEventListener("click", async () => {
        const yes = await VS.confirm({ title: "Delete booking?", message: "This appointment will be permanently removed.", confirmText: "Delete", danger: true });
        if (!yes) return;
        const r = await VS.api("/api/deleteBookHistory", { method: "DELETE", body: { book_id: Number(id) } });
        if (r.ok && r.data && r.data.status) { VS.toast("Booking deleted", "success"); setTimeout(() => (window.location.href = "/bookings"), 600); }
        else VS.toast((r.data && r.data.msg) || "Delete failed", "error");
      });
    })();
  }

  /* =======================  EDIT  ======================= */
  if (page === "bookings-edit") {
    const id = document.body.dataset.id;

    (async () => {
      const [cats, services, booking] = await Promise.all([
        loadCategories(),
        loadServices(),
        (async () => {
          const r = await VS.api("/api/bookingHistory", { method: "POST", body: { uid: "all", page: 1, limit: 500 } });
          const rows = r.ok && r.data && r.data.status ? r.data.result || [] : [];
          return rows.find((b) => String(b.book_id) === String(id)) || null;
        })(),
      ]);

      const typeSel = document.getElementById("bk-vtype");
      const types = [...new Set(cats.map((c) => c.vehicle_type).filter(Boolean))];
      typeSel.innerHTML =
        (types.length ? types : ["Car", "Bike", "Truck", "Van"]).map((t) => '<option value="' + escapeHtml(t) + '">' + escapeHtml(t) + "</option>").join("") +
        "<option>Other</option>";

      const svcSel = document.getElementById("bk-service");
      svcSel.innerHTML = services.map((s) => '<option value="' + escapeHtml(s.title) + '">' + escapeHtml(s.title) + "</option>").join("") + "<option>Other</option>";

      if (!booking) { VS.toast("Booking not found", "error"); return; }
      document.getElementById("bk-vname").value = booking.vehicle_name || "";
      document.getElementById("bk-regno").value = booking.registration_no || "";
      typeSel.value = booking.vehicle_type || "";
      if (!typeSel.value) typeSel.insertAdjacentHTML("afterbegin", '<option selected value="' + escapeHtml(booking.vehicle_type || "") + '">' + escapeHtml(booking.vehicle_type || "—") + "</option>");
      svcSel.value = booking.service_name || "";
      if (!svcSel.value) svcSel.insertAdjacentHTML("afterbegin", '<option selected value="' + escapeHtml(booking.service_name || "") + '">' + escapeHtml(booking.service_name || "—") + "</option>");
      document.getElementById("bk-date").value = booking.slot_date || "";
      document.getElementById("bk-time").value = booking.slot_time || "";

      const photoInput = document.getElementById("bk-photo");
      photoInput.addEventListener("change", () => {
        const f = photoInput.files[0];
        const prev = document.getElementById("bk-photo-preview");
        if (f) { prev.classList.remove("hidden"); prev.querySelector("img").src = URL.createObjectURL(f); }
        else prev.classList.add("hidden");
      });
    })();

    document.getElementById("bk-edit-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData();
      fd.append("book_id", Number(id));
      fd.append("vehicle_name", document.getElementById("bk-vname").value.trim());
      fd.append("registration_no", document.getElementById("bk-regno").value.trim());
      fd.append("vehicle_type", document.getElementById("bk-vtype").value);
      fd.append("service_name", document.getElementById("bk-service").value);
      fd.append("slot_date", document.getElementById("bk-date").value);
      fd.append("slot_time", document.getElementById("bk-time").value);
      const photo = document.getElementById("bk-photo").files[0];
      if (photo) fd.append("vehicle_photo", photo);

      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      const r = await VS.api("/api/updateBookHistory", { method: "PATCH", body: fd, multipart: true });
      btn.disabled = false;
      if (r.ok && r.data && r.data.status) { VS.toast("Appointment updated ✅", "success"); setTimeout(() => (window.location.href = "/bookings"), 700); }
      else VS.toast((r.data && r.data.msg) || "Update failed", "error");
    });
  }
})();

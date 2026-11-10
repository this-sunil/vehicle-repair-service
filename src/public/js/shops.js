/* Shops module — list, create, show, edit */
(function () {
  "use strict";
  const { escapeHtml, fmtDate, emptyRow, debounce } = VS.utils;
  const page = document.body.dataset.page;

  const loadAll = async () => {
    const r = await VS.api("/api/fetchShop", { method: "POST", body: { page: 1, limit: 500 } });
    if (!(r.ok && r.data && r.data.status)) return [];
    // DB columns are lowercase (shopname/shopphoto/shoptime) — normalize keys
    return (r.data.result || []).map((s) => ({
      ...s,
      shopName: s.shopname || s.shopName || "",
      shopPhoto: s.shopphoto || s.shopPhoto || "",
      shopTime: s.shoptime || s.shopTime || "",
    }));
  };

  const findShop = async (id) => (await loadAll()).find((s) => String(s.sid) === String(id)) || null;

  /* =======================  INDEX  ======================= */
  if (page === "shops") {
    let all = [];
    let pageNo = 1;
    const PER = 10;

    const render = () => {
      const q = (document.getElementById("shop-search").value || "").toLowerCase().trim();
      const city = document.getElementById("shop-city").value;
      const rows = all.filter(
        (s) =>
          (!city || (s.city || "").toLowerCase() === city.toLowerCase()) &&
          (!q || [s.shopName, s.city, String(s.phone)].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)))
      );
      const totalPages = Math.max(1, Math.ceil(rows.length / PER));
      pageNo = Math.min(pageNo, totalPages);
      const slice = rows.slice((pageNo - 1) * PER, pageNo * PER);

      const tbody = document.getElementById("shop-tbody");
      tbody.innerHTML = slice.length
        ? slice
            .map(
              (s) =>
                "<tr>" +
                '<td><div class="flex items-center gap-3">' +
                (s.shopPhoto && /^https?:/.test(s.shopPhoto)
                  ? '<img src="' + escapeHtml(s.shopPhoto) + '" class="h-10 w-10 rounded-xl object-cover" alt="">'
                  : '<div class="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm text-white"><i class="bi bi-buildings"></i></div>') +
                '<div><div class="text-sm font-semibold text-slate-800 dark:text-slate-100">' + escapeHtml(s.shopName) + "</div>" +
                '<div class="text-xs text-slate-400">#' + s.sid + "</div></div></div></td>" +
                '<td><span class="badge-slate"><i class="bi bi-geo-alt"></i> ' + escapeHtml(s.city || "—") + "</span></td>" +
                '<td class="text-xs font-medium text-slate-500 dark:text-slate-300">' + escapeHtml(s.shopTime || "—") + "</td>" +
                '<td class="font-mono text-xs font-semibold text-slate-500 dark:text-slate-300">' + escapeHtml(String(s.phone || "—")) + "</td>" +
                "<td>" + (s.status ? '<span class="badge-green"><i class="bi bi-check-circle-fill"></i> active</span>' : '<span class="badge-red"><i class="bi bi-x-circle-fill"></i> inactive</span>') + "</td>" +
                '<td><div class="flex justify-end gap-1.5">' +
                '<a href="/shops/' + s.sid + '" class="btn-secondary btn-sm" title="View"><i class="bi bi-eye"></i></a>' +
                '<a href="/shops/' + s.sid + '/edit" class="btn-secondary btn-sm" title="Edit"><i class="bi bi-pencil"></i></a>' +
                '<button class="btn-secondary btn-sm !text-rose-600 dark:!text-rose-400" data-del="' + s.sid + '" title="Delete"><i class="bi bi-trash3"></i></button>' +
                "</div></td></tr>"
            )
            .join("")
        : emptyRow(6, "bi-buildings", "No service centers found");

      VS.pagination({ page: pageNo, totalPages, total: rows.length, onChange: (p) => { pageNo = p; render(); window.scrollTo({ top: 0, behavior: "smooth" }); } });

      tbody.querySelectorAll("[data-del]").forEach((b) =>
        b.addEventListener("click", async () => {
          const yes = await VS.confirm({ title: "Delete center?", message: "This partner location will be removed.", confirmText: "Delete", danger: true });
          if (!yes) return;
          const r = await VS.api("/api/deleteShop", { method: "POST", body: { sid: Number(b.dataset.del) } });
          if (r.ok && r.data && r.data.status) { VS.toast("Center deleted", "success"); load(); }
          else VS.toast((r.data && r.data.msg) || "Delete failed", "error");
        })
      );
    };

    const load = async () => {
      all = await loadAll();
      const sel = document.getElementById("shop-city");
      const cur = sel.value;
      const cities = [...new Set(all.map((s) => s.city).filter(Boolean))];
      sel.innerHTML = '<option value="">All cities</option>' + cities.map((c) => '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + "</option>").join("");
      sel.value = cur;
      render();
    };

    document.getElementById("shop-search").addEventListener("input", debounce(render, 200));
    document.getElementById("shop-city").addEventListener("change", render);
    document.getElementById("shop-refresh").addEventListener("click", () => { const i = document.querySelector("#shop-refresh i"); i.classList.add("animate-spin"); load().finally(() => i.classList.remove("animate-spin")); });
    document.getElementById("shop-export").addEventListener("click", () => {
      if (!VS.utils.exportCSV("service-centers.csv",
        ["sid", "shopName", "city", "phone", "shopTime", "lat", "long", "status", "created_at"], all))
        VS.toast("Nothing to export", "warning");
      else VS.toast("Service centers exported ✅", "success");
    });

    load();
  }

  /* =======================  CREATE  ======================= */
  if (page === "shops-create") {
    const photoInput = document.getElementById("photo");
    photoInput.addEventListener("change", () => {
      const f = photoInput.files[0];
      const prev = document.getElementById("photo-preview");
      if (f) { prev.classList.remove("hidden"); prev.querySelector("img").src = URL.createObjectURL(f); }
      else prev.classList.add("hidden");
    });

    document.getElementById("shop-create-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const val = (id) => document.getElementById(id).value.trim();
      const fields = ["shopName", "city", "phone", "shopTime", "lat", "long"];
      let bad = false;
      fields.forEach((f) => {
        const el = document.querySelector('[data-error-for="' + f + '"]');
        if (el) { el.textContent = ""; el.classList.add("hidden"); }
        document.getElementById(f).classList.remove("input-error");
      });
      const err = (f, m) => {
        const el = document.querySelector('[data-error-for="' + f + '"]');
        if (el) { el.textContent = m; el.classList.remove("hidden"); }
        document.getElementById(f).classList.add("input-error");
      };
      if (!val("shopName")) { err("shopName", "Required"); bad = true; }
      if (!val("city")) { err("city", "Required"); bad = true; }
      if (!/^\d{6,15}$/.test(val("phone"))) { err("phone", "Valid phone required"); bad = true; }
      if (!val("shopTime")) { err("shopTime", "Required"); bad = true; }
      if (val("lat") === "" || isNaN(Number(val("lat")))) { err("lat", "Valid latitude required"); bad = true; }
      if (val("long") === "" || isNaN(Number(val("long")))) { err("long", "Valid longitude required"); bad = true; }
      if (bad) return;

      const fd = new FormData();
      fd.append("shopName", val("shopName"));
      fd.append("city", val("city"));
      fd.append("phone", val("phone"));
      fd.append("shopTime", val("shopTime"));
      fd.append("lat", val("lat"));
      fd.append("long", val("long"));
      fd.append("status", document.getElementById("status").value);
      const photo = photoInput.files[0];
      if (photo) fd.append("photo", photo);

      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      const r = await VS.api("/api/addShop", { method: "POST", body: fd, multipart: true });
      btn.disabled = false;
      if (r.ok && r.data && r.data.status) { VS.toast("Service center added ✅", "success"); setTimeout(() => (window.location.href = "/shops"), 700); }
      else VS.toast((r.data && r.data.msg) || "Failed to add center", "error");
    });
  }

  /* =======================  SHOW  ======================= */
  if (page === "shops-show") {
    (async () => {
      const s = await findShop(document.body.dataset.id);
      if (!s) { VS.toast("Center not found", "error"); return; }
      document.getElementById("sh-name").textContent = s.shopName;
      document.getElementById("sh-city").textContent = s.city || "—";
      document.getElementById("sh-phone").textContent = s.phone || "—";
      document.getElementById("sh-hours").textContent = s.shopTime || "—";
      const st = document.getElementById("sh-status");
      st.innerHTML = s.status ? '<span class="badge-green"><i class="bi bi-check-circle-fill"></i> Active</span>' : '<span class="badge-red"><i class="bi bi-x-circle-fill"></i> Inactive</span>';
      document.getElementById("sh-coords").textContent = (s.lat || "—") + ", " + (s.long || "—");
      document.getElementById("sh-map-link").href = "https://www.google.com/maps?q=" + s.lat + "," + s.long;
      if (s.shopPhoto && /^https?:/.test(s.shopPhoto))
        document.getElementById("sh-photo").innerHTML = '<img src="' + escapeHtml(s.shopPhoto) + '" class="h-40 w-full object-cover" alt="">';
      document.getElementById("sh-edit-link").href = "/shops/" + s.sid + "/edit";

      document.getElementById("sh-del").addEventListener("click", async () => {
        const yes = await VS.confirm({ title: "Delete center?", message: '"' + s.shopName + '" will be removed.', confirmText: "Delete", danger: true });
        if (!yes) return;
        const r = await VS.api("/api/deleteShop", { method: "POST", body: { sid: Number(s.sid) } });
        if (r.ok && r.data && r.data.status) { VS.toast("Center deleted", "success"); setTimeout(() => (window.location.href = "/shops"), 600); }
        else VS.toast((r.data && r.data.msg) || "Delete failed", "error");
      });
    })();
  }

  /* =======================  EDIT  ======================= */
  if (page === "shops-edit") {
    (async () => {
      const s = await findShop(document.body.dataset.id);
      if (!s) { VS.toast("Center not found", "error"); return; }
      document.getElementById("shopName").value = s.shopName || "";
      document.getElementById("city").value = s.city || "";
      document.getElementById("phone").value = s.phone || "";
      document.getElementById("shopTime").value = s.shopTime || "";
      document.getElementById("lat").value = s.lat || "";
      document.getElementById("long").value = s.long || "";
      document.getElementById("status").value = s.status ? "true" : "false";

      const photoInput = document.getElementById("photo");
      photoInput.addEventListener("change", () => {
        const f = photoInput.files[0];
        const prev = document.getElementById("photo-preview");
        if (f) { prev.classList.remove("hidden"); prev.querySelector("img").src = URL.createObjectURL(f); }
        else prev.classList.add("hidden");
      });
    })();

    document.getElementById("shop-edit-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const val = (id) => document.getElementById(id).value.trim();
      const fd = new FormData();
      fd.append("sid", Number(document.body.dataset.id));
      fd.append("shopName", val("shopName"));
      fd.append("city", val("city"));
      fd.append("phone", val("phone"));
      fd.append("shopTime", val("shopTime"));
      fd.append("lat", val("lat"));
      fd.append("long", val("long"));
      fd.append("status", document.getElementById("status").value);
      const photo = document.getElementById("photo").files[0];
      if (photo) fd.append("photo", photo);

      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      const r = await VS.api("/api/updateShop", { method: "PATCH", body: fd, multipart: true });
      btn.disabled = false;
      if (r.ok && r.data && r.data.status) { VS.toast("Center updated ✅", "success"); setTimeout(() => (window.location.href = "/shops"), 700); }
      else VS.toast((r.data && r.data.msg) || "Update failed", "error");
    });
  }
})();

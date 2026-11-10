/* Services module — grid list, create, show, edit */
(function () {
  "use strict";
  const { escapeHtml, fmtDate, debounce } = VS.utils;
  const page = document.body.dataset.page;

  const GRADIENTS = [
    "from-brand-500 to-violet-600",
    "from-amber-500 to-orange-600",
    "from-emerald-500 to-teal-600",
    "from-rose-500 to-pink-600",
    "from-sky-500 to-blue-600",
    "from-fuchsia-500 to-purple-600",
  ];

  const loadAll = async () => {
    const r = await VS.api("/api/getAllService", { method: "POST", body: { page: 1, limit: 500 } });
    return r.ok && r.data && r.data.status ? r.data.result || [] : [];
  };

  const findService = async (id) => (await loadAll()).find((s) => String(s.id) === String(id)) || null;

  /* =======================  INDEX  ======================= */
  if (page === "services") {
    let all = [];
    let pageNo = 1;
    const PER = 9;

    const render = () => {
      const q = (document.getElementById("svc-search").value || "").toLowerCase().trim();
      const rows = all.filter(
        (s) => !q || (s.title + " " + (s.description || "")).toLowerCase().includes(q)
      );
      const totalPages = Math.max(1, Math.ceil(rows.length / PER));
      pageNo = Math.min(pageNo, totalPages);
      const slice = rows.slice((pageNo - 1) * PER, pageNo * PER);

      const grid = document.getElementById("svc-grid");
      grid.innerHTML = slice.length
        ? slice
            .map((s, i) => {
              const g = GRADIENTS[i % GRADIENTS.length];
              const img =
                s.photo && /^https?:/.test(s.photo)
                  ? '<img src="' + escapeHtml(s.photo) + '" class="h-36 w-full rounded-2xl object-cover" alt="' + escapeHtml(s.title) + '">'
                  : '<div class="grid h-36 w-full place-items-center rounded-2xl bg-gradient-to-br ' + g + '"><i class="bi bi-tools text-4xl text-white/80"></i></div>';
              return (
                '<div class="card card-hover group animate-fadeUp overflow-hidden p-4">' +
                img +
                '<h3 class="mt-4 line-clamp-1 text-base font-bold text-slate-900 dark:text-white">' + escapeHtml(s.title) + "</h3>" +
                '<p class="mt-1 line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed text-slate-500 dark:text-slate-400">' + escapeHtml(s.description || "No description") + "</p>" +
                '<div class="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">' +
                '<span class="text-[11px] font-semibold text-slate-400"><i class="bi bi-calendar3"></i> ' + fmtDate(s.created_at) + "</span>" +
                '<div class="flex gap-1.5">' +
                '<a href="/services/' + s.id + '" class="btn-secondary btn-sm" title="View"><i class="bi bi-eye"></i></a>' +
                '<a href="/services/' + s.id + '/edit" class="btn-secondary btn-sm" title="Edit"><i class="bi bi-pencil"></i></a>' +
                '<button class="btn-secondary btn-sm !text-rose-600 dark:!text-rose-400" data-del="' + s.id + '" title="Delete"><i class="bi bi-trash3"></i></button>' +
                "</div></div></div>"
              );
            })
            .join("")
        : '<div class="col-span-full card p-12 text-center"><div class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 dark:bg-slate-800"><i class="bi bi-inbox text-2xl text-slate-400"></i></div><p class="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">No services found</p><a href="/services/create" class="btn-primary btn-sm mt-4"><i class="bi bi-plus-lg"></i> Add your first service</a></div>';

      VS.pagination({ page: pageNo, totalPages, total: rows.length, onChange: (p) => { pageNo = p; render(); window.scrollTo({ top: 0, behavior: "smooth" }); } });

      grid.querySelectorAll("[data-del]").forEach((b) =>
        b.addEventListener("click", async () => {
          const yes = await VS.confirm({ title: "Delete service?", message: "This catalog entry will be removed.", confirmText: "Delete", danger: true });
          if (!yes) return;
          const r = await VS.api("/api/deleteService", { method: "POST", body: { id: Number(b.dataset.del) } });
          if (r.ok && r.data && r.data.status) { VS.toast("Service deleted", "success"); load(); }
          else VS.toast((r.data && r.data.msg) || "Delete failed", "error");
        })
      );
    };

    const load = async () => {
      all = await loadAll();
      render();
    };

    document.getElementById("svc-search").addEventListener("input", debounce(render, 200));
    document.getElementById("svc-refresh").addEventListener("click", () => { const i = document.querySelector("#svc-refresh i"); i.classList.add("animate-spin"); load().finally(() => i.classList.remove("animate-spin")); });
    document.getElementById("svc-export").addEventListener("click", () => {
      if (!VS.utils.exportCSV("services.csv", ["id", "title", "description", "created_at"], all))
        VS.toast("Nothing to export", "warning");
      else VS.toast("Services exported ✅", "success");
    });

    load();
  }

  /* =======================  CREATE  ======================= */
  if (page === "services-create") {
    const photoInput = document.getElementById("photo");
    photoInput.addEventListener("change", () => {
      const f = photoInput.files[0];
      const prev = document.getElementById("photo-preview");
      if (f) { prev.classList.remove("hidden"); prev.querySelector("img").src = URL.createObjectURL(f); }
      else prev.classList.add("hidden");
    });

    document.getElementById("svc-create-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("title").value.trim();
      const description = document.getElementById("description").value.trim();
      ["title", "description"].forEach((f) => {
        const el = document.querySelector('[data-error-for="' + f + '"]');
        if (el) { el.textContent = ""; el.classList.add("hidden"); }
        document.getElementById(f).classList.remove("input-error");
      });
      if (!title) { err("title", "Title is required"); return; }
      if (!description) { err("description", "Description is required"); return; }
      function err(f, m) {
        const el = document.querySelector('[data-error-for="' + f + '"]');
        if (el) { el.textContent = m; el.classList.remove("hidden"); }
        document.getElementById(f).classList.add("input-error");
      }

      const fd = new FormData();
      fd.append("title", title);
      fd.append("description", description);
      const photo = photoInput.files[0];
      if (photo) fd.append("photo", photo);

      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      const r = await VS.api("/api/addService", { method: "POST", body: fd, multipart: true });
      btn.disabled = false;
      if (r.ok && r.data && r.data.status) { VS.toast("Service added ✅", "success"); setTimeout(() => (window.location.href = "/services"), 700); }
      else VS.toast((r.data && r.data.msg) || "Failed to add service", "error");
    });
  }

  /* =======================  SHOW  ======================= */
  if (page === "services-show") {
    (async () => {
      const s = await findService(document.body.dataset.id);
      if (!s) { VS.toast("Service not found", "error"); return; }
      document.getElementById("s-title").textContent = s.title;
      document.getElementById("s-added").textContent = "Added " + fmtDate(s.created_at);
      document.getElementById("s-desc").textContent = s.description || "No description available.";
      const photoWrap = document.getElementById("s-photo");
      if (s.photo && /^https?:/.test(s.photo)) photoWrap.innerHTML = '<img src="' + escapeHtml(s.photo) + '" class="h-48 w-full object-cover" alt="">';
      document.getElementById("s-edit-link").href = "/services/" + s.id + "/edit";

      document.getElementById("s-del").addEventListener("click", async () => {
        const yes = await VS.confirm({ title: "Delete service?", message: '"' + s.title + '" will be removed from the catalog.', confirmText: "Delete", danger: true });
        if (!yes) return;
        const r = await VS.api("/api/deleteService", { method: "POST", body: { id: Number(s.id) } });
        if (r.ok && r.data && r.data.status) { VS.toast("Service deleted", "success"); setTimeout(() => (window.location.href = "/services"), 600); }
        else VS.toast((r.data && r.data.msg) || "Delete failed", "error");
      });
    })();
  }

  /* =======================  EDIT  ======================= */
  if (page === "services-edit") {
    (async () => {
      const s = await findService(document.body.dataset.id);
      if (!s) { VS.toast("Service not found", "error"); return; }
      document.getElementById("title").value = s.title || "";
      document.getElementById("description").value = s.description || "";

      const photoInput = document.getElementById("photo");
      photoInput.addEventListener("change", () => {
        const f = photoInput.files[0];
        const prev = document.getElementById("photo-preview");
        if (f) { prev.classList.remove("hidden"); prev.querySelector("img").src = URL.createObjectURL(f); }
        else prev.classList.add("hidden");
      });
    })();

    document.getElementById("svc-edit-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData();
      fd.append("id", Number(document.body.dataset.id));
      fd.append("title", document.getElementById("title").value.trim());
      fd.append("description", document.getElementById("description").value.trim());
      const photo = document.getElementById("photo").files[0];
      if (photo) fd.append("photo", photo);

      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      const r = await VS.api("/api/updateService", { method: "PUT", body: fd, multipart: true });
      btn.disabled = false;
      if (r.ok && r.data && r.data.status) { VS.toast("Service updated ✅", "success"); setTimeout(() => (window.location.href = "/services"), 700); }
      else VS.toast((r.data && r.data.msg) || "Update failed", "error");
    });
  }
})();

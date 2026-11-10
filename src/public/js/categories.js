/* Categories module — tile grid, create, show, edit */
(function () {
  "use strict";
  const { escapeHtml, fmtDate, debounce } = VS.utils;
  const page = document.body.dataset.page;

  const TILE_COLORS = [
    "from-brand-500 to-violet-600",
    "from-amber-500 to-orange-600",
    "from-emerald-500 to-teal-600",
    "from-rose-500 to-pink-600",
    "from-sky-500 to-blue-600",
    "from-fuchsia-500 to-purple-600",
  ];

  const loadAll = async () => {
    const r = await VS.api("/api/getAllCategory?page=1&limit=500");
    return r.ok && r.data && r.data.status ? r.data.result || [] : [];
  };

  const findCat = async (id) => (await loadAll()).find((c) => String(c.cid) === String(id)) || null;

  /* =======================  INDEX  ======================= */
  if (page === "categories") {
    let all = [];
    let pageNo = 1;
    const PER = 12;

    const render = () => {
      const q = (document.getElementById("cat-search").value || "").toLowerCase().trim();
      const rows = all.filter((c) => !q || (c.title + " " + (c.vehicle_type || "")).toLowerCase().includes(q));
      const totalPages = Math.max(1, Math.ceil(rows.length / PER));
      pageNo = Math.min(pageNo, totalPages);
      const slice = rows.slice((pageNo - 1) * PER, pageNo * PER);

      const grid = document.getElementById("cat-grid");
      grid.innerHTML = slice.length
        ? slice
            .map((c, i) => {
              const g = TILE_COLORS[i % TILE_COLORS.length];
              const img =
                c.photo && /^https?:/.test(c.photo)
                  ? '<img src="' + escapeHtml(c.photo) + '" class="h-20 w-full rounded-xl object-cover" alt="' + escapeHtml(c.title) + '">'
                  : '<div class="grid h-20 w-full place-items-center rounded-xl bg-gradient-to-br ' + g + '"><i class="bi bi-grid-3x3-gap text-2xl text-white/80"></i></div>';
              return (
                '<div class="card card-hover group animate-fadeUp p-4 text-center">' +
                img +
                '<h3 class="mt-3 truncate text-sm font-bold text-slate-800 dark:text-slate-100">' + escapeHtml(c.title) + "</h3>" +
                '<span class="badge-slate mt-1.5">' + escapeHtml(c.vehicle_type || "—") + "</span>" +
                '<div class="mt-3 flex justify-center gap-1.5 border-t border-slate-100 pt-3 opacity-100 dark:border-slate-800">' +
                '<a href="/categories/' + c.cid + '" class="btn-secondary btn-sm !px-2" title="View"><i class="bi bi-eye"></i></a>' +
                '<a href="/categories/' + c.cid + '/edit" class="btn-secondary btn-sm !px-2" title="Edit"><i class="bi bi-pencil"></i></a>' +
                '<button class="btn-secondary btn-sm !px-2 !text-rose-600 dark:!text-rose-400" data-del="' + c.cid + '" title="Delete"><i class="bi bi-trash3"></i></button>' +
                "</div></div>"
              );
            })
            .join("")
        : '<div class="col-span-full card p-12 text-center"><div class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 dark:bg-slate-800"><i class="bi bi-grid-3x3-gap text-2xl text-slate-400"></i></div><p class="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">No categories yet</p><a href="/categories/create" class="btn-primary btn-sm mt-4"><i class="bi bi-plus-lg"></i> Add one</a></div>';

      VS.pagination({ page: pageNo, totalPages, total: rows.length, onChange: (p) => { pageNo = p; render(); window.scrollTo({ top: 0, behavior: "smooth" }); } });

      grid.querySelectorAll("[data-del]").forEach((b) =>
        b.addEventListener("click", async () => {
          const yes = await VS.confirm({ title: "Delete category?", message: "This category will be removed.", confirmText: "Delete", danger: true });
          if (!yes) return;
          const r = await VS.api("/api/deleteCatById", { method: "DELETE", body: { cid: Number(b.dataset.del) } });
          if (r.ok && r.data && r.data.status) { VS.toast("Category deleted", "success"); load(); }
          else VS.toast((r.data && r.data.msg) || "Delete failed", "error");
        })
      );
    };

    const load = async () => {
      all = await loadAll();
      render();
    };

    document.getElementById("cat-search").addEventListener("input", debounce(render, 200));
    document.getElementById("cat-refresh").addEventListener("click", () => { const i = document.querySelector("#cat-refresh i"); i.classList.add("animate-spin"); load().finally(() => i.classList.remove("animate-spin")); });
    document.getElementById("cat-export").addEventListener("click", () => {
      if (!VS.utils.exportCSV("categories.csv", ["cid", "title", "vehicle_type", "created_at"], all))
        VS.toast("Nothing to export", "warning");
      else VS.toast("Categories exported ✅", "success");
    });

    load();
  }

  /* =======================  CREATE  ======================= */
  if (page === "categories-create") {
    const photoInput = document.getElementById("photo");
    photoInput.addEventListener("change", () => {
      const f = photoInput.files[0];
      const prev = document.getElementById("photo-preview");
      if (f) { prev.classList.remove("hidden"); prev.querySelector("img").src = URL.createObjectURL(f); }
      else prev.classList.add("hidden");
    });

    document.getElementById("cat-create-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("title").value.trim();
      const type = document.getElementById("type").value.trim();
      const err = (f, m) => {
        const el = document.querySelector('[data-error-for="' + f + '"]');
        if (el) { el.textContent = m; el.classList.remove("hidden"); }
        document.getElementById(f).classList.add("input-error");
      };
      ["title", "type"].forEach((f) => {
        const el = document.querySelector('[data-error-for="' + f + '"]');
        if (el) { el.textContent = ""; el.classList.add("hidden"); }
        document.getElementById(f).classList.remove("input-error");
      });
      if (!title) { err("title", "Title is required"); return; }
      if (!type) { err("type", "Vehicle type is required"); return; }

      const fd = new FormData();
      fd.append("title", title);
      fd.append("type", type);
      const photo = photoInput.files[0];
      if (photo) fd.append("photo", photo);

      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      const r = await VS.api("/api/addCategory", { method: "POST", body: fd, multipart: true });
      btn.disabled = false;
      if (r.ok && r.data && r.data.status) { VS.toast("Category added ✅", "success"); setTimeout(() => (window.location.href = "/categories"), 700); }
      else VS.toast((r.data && r.data.msg) || "Failed to add category", "error");
    });
  }

  /* =======================  SHOW  ======================= */
  if (page === "categories-show") {
    (async () => {
      const c = await findCat(document.body.dataset.id);
      if (!c) { VS.toast("Category not found", "error"); return; }
      document.getElementById("c-title").textContent = c.title;
      document.getElementById("c-type").textContent = c.vehicle_type || "—";
      document.getElementById("c-added").textContent = "Created " + fmtDate(c.created_at);
      if (c.photo && /^https?:/.test(c.photo))
        document.getElementById("c-photo").innerHTML = '<img src="' + escapeHtml(c.photo) + '" class="h-52 w-full object-cover" alt="">';
      document.getElementById("c-edit-link").href = "/categories/" + c.cid + "/edit";

      document.getElementById("c-del").addEventListener("click", async () => {
        const yes = await VS.confirm({ title: "Delete category?", message: '"' + c.title + '" will be removed.', confirmText: "Delete", danger: true });
        if (!yes) return;
        const r = await VS.api("/api/deleteCatById", { method: "DELETE", body: { cid: Number(c.cid) } });
        if (r.ok && r.data && r.data.status) { VS.toast("Category deleted", "success"); setTimeout(() => (window.location.href = "/categories"), 600); }
        else VS.toast((r.data && r.data.msg) || "Delete failed", "error");
      });
    })();
  }

  /* =======================  EDIT  ======================= */
  if (page === "categories-edit") {
    (async () => {
      const c = await findCat(document.body.dataset.id);
      if (!c) { VS.toast("Category not found", "error"); return; }
      document.getElementById("title").value = c.title || "";
      document.getElementById("type").value = c.vehicle_type || "";

      const photoInput = document.getElementById("photo");
      photoInput.addEventListener("change", () => {
        const f = photoInput.files[0];
        const prev = document.getElementById("photo-preview");
        if (f) { prev.classList.remove("hidden"); prev.querySelector("img").src = URL.createObjectURL(f); }
        else prev.classList.add("hidden");
      });
    })();

    document.getElementById("cat-edit-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData();
      fd.append("cid", Number(document.body.dataset.id));
      fd.append("title", document.getElementById("title").value.trim());
      fd.append("type", document.getElementById("type").value.trim());
      const photo = document.getElementById("photo").files[0];
      if (photo) fd.append("photo", photo);

      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      const r = await VS.api("/api/updateCategory", { method: "POST", body: fd, multipart: true });
      btn.disabled = false;
      if (r.ok && r.data && r.data.status) { VS.toast("Category updated ✅", "success"); setTimeout(() => (window.location.href = "/categories"), 700); }
      else VS.toast((r.data && r.data.msg) || "Update failed", "error");
    });
  }
})();

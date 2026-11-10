/* Notifications module — list, create, show, edit */
(function () {
  "use strict";
  const { escapeHtml, fmtDate, timeAgo, emptyRow, debounce } = VS.utils;
  const page = document.body.dataset.page;

  const loadAll = async () => {
    const r = await VS.api("/api/fetchNotification", { method: "POST", body: { page: 1 } });
    return r.ok && r.data && r.data.status ? r.data.result || [] : [];
  };

  const findNtf = async (id) => (await loadAll()).find((n) => String(n.id) === String(id)) || null;

  /* =======================  INDEX  ======================= */
  if (page === "notifications") {
    let all = [];
    let pageNo = 1;
    const PER = 10;

    const render = () => {
      const q = (document.getElementById("ntf-search").value || "").toLowerCase().trim();
      const rows = all.filter((n) => !q || ((n.title || "") + " " + (n.subtitle || "")).toLowerCase().includes(q));
      const totalPages = Math.max(1, Math.ceil(rows.length / PER));
      pageNo = Math.min(pageNo, totalPages);
      const slice = rows.slice((pageNo - 1) * PER, pageNo * PER);

      const tbody = document.getElementById("ntf-tbody");
      tbody.innerHTML = slice.length
        ? slice
            .map(
              (n) =>
                "<tr>" +
                '<td><div class="flex items-center gap-3">' +
                (n.photo && /^https?:/.test(n.photo)
                  ? '<img src="' + escapeHtml(n.photo) + '" class="h-10 w-10 rounded-xl object-cover" alt="">'
                  : '<div class="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-sm text-white"><i class="bi bi-megaphone"></i></div>') +
                '<div class="text-sm font-semibold text-slate-800 dark:text-slate-100">' + escapeHtml(n.title || "—") + "</div></div></td>" +
                '<td class="max-w-xs"><p class="truncate text-xs text-slate-500 dark:text-slate-400">' + escapeHtml(n.subtitle || "—") + "</p></td>" +
                '<td><div class="text-xs font-semibold text-slate-600 dark:text-slate-300">' + timeAgo(n.created_at) + '</div><div class="text-xs text-slate-400">' + fmtDate(n.created_at) + "</div></td>" +
                '<td><div class="flex justify-end gap-1.5">' +
                '<a href="/notifications/' + n.id + '" class="btn-secondary btn-sm" title="View"><i class="bi bi-eye"></i></a>' +
                '<a href="/notifications/' + n.id + '/edit" class="btn-secondary btn-sm" title="Edit"><i class="bi bi-pencil"></i></a>' +
                '<button class="btn-secondary btn-sm !text-rose-600 dark:!text-rose-400" data-del="' + n.id + '" title="Delete"><i class="bi bi-trash3"></i></button>' +
                "</div></td></tr>"
            )
            .join("")
        : emptyRow(4, "bi-megaphone", "No broadcasts sent yet");

      VS.pagination({ page: pageNo, totalPages, total: rows.length, onChange: (p) => { pageNo = p; render(); window.scrollTo({ top: 0, behavior: "smooth" }); } });

      tbody.querySelectorAll("[data-del]").forEach((b) =>
        b.addEventListener("click", async () => {
          const yes = await VS.confirm({ title: "Delete broadcast?", message: "This announcement will be removed.", confirmText: "Delete", danger: true });
          if (!yes) return;
          const r = await VS.api("/api/deleteNotification", { method: "DELETE", body: { id: Number(b.dataset.del) } });
          if (r.ok && r.data && r.data.status) { VS.toast("Broadcast deleted", "success"); load(); }
          else VS.toast((r.data && r.data.msg) || "Delete failed", "error");
        })
      );
    };

    const load = async () => {
      all = await loadAll();
      render();
    };

    document.getElementById("ntf-search").addEventListener("input", debounce(render, 200));
    document.getElementById("ntf-refresh").addEventListener("click", () => { const i = document.querySelector("#ntf-refresh i"); i.classList.add("animate-spin"); load().finally(() => i.classList.remove("animate-spin")); });
    document.getElementById("ntf-export").addEventListener("click", () => {
      if (!VS.utils.exportCSV("broadcasts.csv", ["id", "title", "subtitle", "created_at"], all))
        VS.toast("Nothing to export", "warning");
      else VS.toast("Broadcasts exported ✅", "success");
    });

    load();
  }

  /* =======================  CREATE  ======================= */
  if (page === "notifications-create") {
    const photoInput = document.getElementById("photo");
    photoInput.addEventListener("change", () => {
      const f = photoInput.files[0];
      const prev = document.getElementById("photo-preview");
      if (f) { prev.classList.remove("hidden"); prev.querySelector("img").src = URL.createObjectURL(f); }
      else prev.classList.add("hidden");
    });

    document.getElementById("ntf-create-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("title").value.trim();
      const description = document.getElementById("description").value.trim();
      const err = (f, m) => {
        const el = document.querySelector('[data-error-for="' + f + '"]');
        if (el) { el.textContent = m; el.classList.remove("hidden"); }
        document.getElementById(f).classList.add("input-error");
      };
      ["title", "description"].forEach((f) => {
        const el = document.querySelector('[data-error-for="' + f + '"]');
        if (el) { el.textContent = ""; el.classList.add("hidden"); }
        document.getElementById(f).classList.remove("input-error");
      });
      if (!title) { err("title", "Headline is required"); return; }
      if (!description) { err("description", "Message is required"); return; }

      const fd = new FormData();
      fd.append("title", title);
      fd.append("description", description);
      const photo = photoInput.files[0];
      if (photo) fd.append("photo", photo);

      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      const r = await VS.api("/api/addNotification", { method: "POST", body: fd, multipart: true });
      btn.disabled = false;
      if (r.ok && r.data && r.data.status) { VS.toast("Broadcast sent 📣", "success"); setTimeout(() => (window.location.href = "/notifications"), 700); }
      else VS.toast((r.data && r.data.msg) || "Failed to send broadcast", "error");
    });
  }

  /* =======================  SHOW  ======================= */
  if (page === "notifications-show") {
    (async () => {
      const n = await findNtf(document.body.dataset.id);
      if (!n) { VS.toast("Broadcast not found", "error"); return; }
      document.getElementById("n-title").textContent = n.title || "—";
      document.getElementById("n-sent").textContent = "Sent " + fmtDate(n.created_at) + " · " + timeAgo(n.created_at);
      document.getElementById("n-desc").textContent = n.subtitle || "No message content.";
      document.getElementById("n-edit-link").href = "/notifications/" + n.id + "/edit";
      if (n.photo && /^https?:/.test(n.photo)) {
        const w = document.getElementById("n-photo");
        w.classList.remove("hidden");
        w.querySelector("img").src = n.photo;
      }

      document.getElementById("n-del").addEventListener("click", async () => {
        const yes = await VS.confirm({ title: "Delete broadcast?", message: "This announcement will be removed.", confirmText: "Delete", danger: true });
        if (!yes) return;
        const r = await VS.api("/api/deleteNotification", { method: "DELETE", body: { id: Number(n.id) } });
        if (r.ok && r.data && r.data.status) { VS.toast("Broadcast deleted", "success"); setTimeout(() => (window.location.href = "/notifications"), 600); }
        else VS.toast((r.data && r.data.msg) || "Delete failed", "error");
      });
    })();
  }

  /* =======================  EDIT  ======================= */
  if (page === "notifications-edit") {
    (async () => {
      const n = await findNtf(document.body.dataset.id);
      if (!n) { VS.toast("Broadcast not found", "error"); return; }
      document.getElementById("title").value = n.title || "";
      document.getElementById("description").value = n.subtitle || "";

      const photoInput = document.getElementById("photo");
      photoInput.addEventListener("change", () => {
        const f = photoInput.files[0];
        const prev = document.getElementById("photo-preview");
        if (f) { prev.classList.remove("hidden"); prev.querySelector("img").src = URL.createObjectURL(f); }
        else prev.classList.add("hidden");
      });
    })();

    document.getElementById("ntf-edit-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData();
      fd.append("id", Number(document.body.dataset.id));
      fd.append("title", document.getElementById("title").value.trim());
      fd.append("description", document.getElementById("description").value.trim());
      const photo = document.getElementById("photo").files[0];
      if (photo) fd.append("photo", photo);

      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      const r = await VS.api("/api/updateNotification", { method: "PATCH", body: fd, multipart: true });
      btn.disabled = false;
      if (r.ok && r.data && r.data.status) { VS.toast("Broadcast updated ✅", "success"); setTimeout(() => (window.location.href = "/notifications"), 700); }
      else VS.toast((r.data && r.data.msg) || "Update failed", "error");
    });
  }
})();

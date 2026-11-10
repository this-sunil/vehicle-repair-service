/* Activity log — audit trail list with filters */
(function () {
  "use strict";
  const { escapeHtml, timeAgo, fmtDate, emptyRow, debounce } = VS.utils;
  const page = document.body.dataset.page;
  if (page !== "activity") return;

  const ACTION_STYLE = {
    create: { icon: "bi-plus-circle-fill", cls: "badge-green", label: "create" },
    update: { icon: "bi-pencil-fill", cls: "badge-blue", label: "update" },
    delete: { icon: "bi-trash3-fill", cls: "badge-red", label: "delete" },
    login: { icon: "bi-box-arrow-in-right", cls: "badge-slate", label: "login" },
    security: { icon: "bi-shield-fill-exclamation", cls: "badge-amber", label: "security" },
  };
  const ENTITY_ICON = {
    user: "bi-people",
    booking: "bi-calendar-check",
    service: "bi-wrench-adjustable",
    category: "bi-grid-3x3-gap",
    shop: "bi-buildings",
    plan: "bi-credit-card-2-front",
    notification: "bi-megaphone",
    setting: "bi-gear",
    auth: "bi-person-badge",
  };

  let allLogs = [];
  let pageNo = 1;
  const PER = 12;

  const applyFilters = () => {
    const q = (document.getElementById("act-search").value || "").toLowerCase().trim();
    const action = document.getElementById("act-action").value;
    const entity = document.getElementById("act-entity").value;
    const filtered = allLogs.filter(
      (l) =>
        (!action || l.action === action) &&
        (!entity || l.entity === entity) &&
        (!q ||
          String(l.details || "").toLowerCase().includes(q) ||
          String(l.admin_name || "").toLowerCase().includes(q) ||
          String(l.entity || "").toLowerCase().includes(q))
    );
    render(filtered);
  };

  const render = (list) => {
    const total = list.length;
    const totalPages = Math.max(1, Math.ceil(total / PER));
    pageNo = Math.min(pageNo, totalPages);
    const slice = list.slice((pageNo - 1) * PER, pageNo * PER);

    const tbody = document.getElementById("act-tbody");
    tbody.innerHTML = slice.length
      ? slice
          .map((l) => {
            const a = ACTION_STYLE[l.action] || { icon: "bi-activity", cls: "badge-slate", label: l.action };
            const eicon = ENTITY_ICON[l.entity] || "bi-folder";
            return (
              "<tr>" +
              '<td><span class="' + a.cls + ' capitalize"><i class="bi ' + a.icon + '"></i> ' + escapeHtml(a.label) + "</span></td>" +
              '<td><span class="text-sm font-semibold capitalize text-slate-700 dark:text-slate-200"><i class="bi ' + eicon + ' text-slate-400"></i> ' + escapeHtml(l.entity || "—") + "</span>" +
              (l.entity_id ? '<div class="text-xs text-slate-400">#' + escapeHtml(String(l.entity_id)) + "</div>" : "") +
              "</td>" +
              '<td class="max-w-md"><div class="truncate text-sm text-slate-600 dark:text-slate-300" title="' + escapeHtml(l.details || "") + '">' + escapeHtml(l.details || "—") + "</div></td>" +
              '<td><div class="flex items-center gap-2"><span class="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-600 text-[11px] font-bold text-white">' + escapeHtml(((l.admin_name || "S") + "").slice(0, 1).toUpperCase()) + "</span>" +
              '<span class="text-sm font-medium text-slate-700 dark:text-slate-200">' + escapeHtml(l.admin_name || "system") + "</span></div></td>" +
              '<td class="font-mono text-xs text-slate-400">' + escapeHtml(l.ip || "—") + "</td>" +
              '<td><div class="text-xs font-semibold text-slate-700 dark:text-slate-200">' + timeAgo(l.created_at) + '</div><div class="text-[11px] text-slate-400">' + fmtDate(l.created_at) + "</div></td>" +
              "</tr>"
            );
          })
          .join("")
      : emptyRow(6, "bi-clock-history", "No activity recorded yet");

    VS.pagination({ page: pageNo, totalPages, total, onChange: (p) => { pageNo = p; applyFilters(); window.scrollTo({ top: 0, behavior: "smooth" }); } });
  };

  const load = async () => {
    const r = await VS.api("/api/activity?limit=100");
    allLogs = r.ok && r.data && r.data.status ? r.data.result || [] : [];
    applyFilters();
  };

  document.getElementById("act-search").addEventListener("input", debounce(applyFilters, 200));
  document.getElementById("act-action").addEventListener("change", applyFilters);
  document.getElementById("act-entity").addEventListener("change", applyFilters);
  document.getElementById("act-refresh").addEventListener("click", () => {
    const i = document.getElementById("act-refresh").querySelector("i");
    i.classList.add("animate-spin");
    load().finally(() => i.classList.remove("animate-spin"));
  });

  document.getElementById("act-export").addEventListener("click", () => {
    VS.utils.exportCSV(
      "activity-log.csv",
      ["id", "admin_name", "action", "entity", "entity_id", "details", "ip", "created_at"],
      allLogs
    );
    VS.toast("Activity log exported ✅", "success");
  });

  load();
})();

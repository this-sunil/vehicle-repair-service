/* Plans module — pricing cards, create, show, edit */
(function () {
  "use strict";
  const { escapeHtml, fmtDate } = VS.utils;
  const page = document.body.dataset.page;

  const loadAll = async () => {
    const r = await VS.api("/api/fetchPlan", { method: "POST", body: {} });
    return r.ok && r.data && r.data.status ? r.data.result || [] : [];
  };

  const findPlan = async (id) => (await loadAll()).find((p) => String(p.pid) === String(id)) || null;

  const CYCLE = { monthly: "month", quarterly: "quarter", yearly: "year" };

  /* =======================  INDEX  ======================= */
  if (page === "plans") {
    let allPlans = [];

    const render = (plans) => {
      allPlans = plans;
      const grid = document.getElementById("plan-grid");
      grid.innerHTML = plans.length
        ? plans
            .map((p, i) => {
              const featured = i === plans.length - 1;
              return (
                '<div class="card card-hover relative overflow-hidden p-8 text-center animate-fadeUp ' +
                (featured ? "border-brand-300 dark:border-brand-500/40 shadow-glow" : "") +
                '">' +
                '<div class="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand-500 to-violet-600"></div>' +
                (featured ? '<span class="badge-blue absolute right-4 top-4">⭐ latest</span>' : "") +
                '<span class="badge-slate capitalize">' + escapeHtml(p.plan_type || "plan") + "</span>" +
                '<h3 class="mt-4 text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">' + escapeHtml(p.plan_title) + "</h3>" +
                '<p class="mt-4"><span class="text-4xl font-extrabold text-slate-900 dark:text-white">₹' + escapeHtml(String(p.plan_price)) + "</span>" +
                '<span class="text-sm font-medium text-slate-400">/' + (CYCLE[p.plan_type] || "month") + "</span></p>" +
                '<p class="mt-2 text-xs text-slate-400"><i class="bi bi-calendar3"></i> Added ' + fmtDate(p.created_at) + "</p>" +
                '<div class="mt-6 flex justify-center gap-2">' +
                '<a href="/plans/' + p.pid + '" class="btn-secondary btn-sm"><i class="bi bi-eye"></i> View</a>' +
                '<a href="/plans/' + p.pid + '/edit" class="btn-secondary btn-sm"><i class="bi bi-pencil"></i> Edit</a>' +
                '<button class="btn-secondary btn-sm !text-rose-600 dark:!text-rose-400" data-del="' + p.pid + '"><i class="bi bi-trash3"></i></button>' +
                "</div></div>"
              );
            })
            .join("")
        : '<div class="col-span-full card p-14 text-center"><div class="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-brand-50 dark:bg-brand-500/10"><i class="bi bi-credit-card-2-front text-3xl text-brand-500"></i></div><h3 class="mt-4 text-base font-bold text-slate-800 dark:text-slate-100">No subscription plans yet</h3><p class="mt-1 text-sm text-slate-400">Create 2–3 tiers to convert customers into recurring revenue.</p><a href="/plans/create" class="btn-primary btn-md mt-6"><i class="bi bi-plus-lg"></i> Create your first plan</a></div>';

      grid.querySelectorAll("[data-del]").forEach((b) =>
        b.addEventListener("click", async () => {
          const yes = await VS.confirm({ title: "Delete plan?", message: "This subscription plan will be removed.", confirmText: "Delete", danger: true });
          if (!yes) return;
          const r = await VS.api("/api/deletePlan", { method: "POST", body: { pid: Number(b.dataset.del) } });
          if (r.ok && r.data && r.data.status) { VS.toast("Plan deleted", "success"); load(); }
          else VS.toast((r.data && r.data.msg) || "Delete failed", "error");
        })
      );
    };

    const load = async () => {
      const r = await loadAll();
      render(r);
    };

    document.getElementById("plan-refresh").addEventListener("click", () => {
      const i = document.querySelector("#plan-refresh i");
      i.classList.add("animate-spin");
      load().finally(() => i.classList.remove("animate-spin"));
    });

    document.getElementById("plan-export").addEventListener("click", () => {
      if (!VS.utils.exportCSV("plans.csv", ["pid", "plan_title", "plan_type", "plan_price", "created_at"], allPlans))
        VS.toast("Nothing to export", "warning");
      else VS.toast("Plans exported ✅", "success");
    });

    load();
  }

  /* =======================  CREATE  ======================= */
  if (page === "plans-create") {
    document.getElementById("plan-create-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const title = document.getElementById("plan_title").value.trim();
      const type = document.getElementById("plan_type").value;
      const price = document.getElementById("plan_price").value;

      const err = (f, m) => {
        const el = document.querySelector('[data-error-for="' + f + '"]');
        if (el) { el.textContent = m; el.classList.remove("hidden"); }
        document.getElementById(f).classList.add("input-error");
      };
      ["plan_title", "plan_type", "plan_price"].forEach((f) => {
        const el = document.querySelector('[data-error-for="' + f + '"]');
        if (el) { el.textContent = ""; el.classList.add("hidden"); }
        document.getElementById(f).classList.remove("input-error");
      });
      if (!title) { err("plan_title", "Title is required"); return; }
      if (price === "" || isNaN(Number(price)) || Number(price) < 0) { err("plan_price", "Enter a valid price"); return; }

      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      const r = await VS.api("/api/addPlan", { method: "POST", body: { plan_title: title, plan_type: type, plan_price: Number(price) } });
      btn.disabled = false;
      if (r.ok && r.data && r.data.status) { VS.toast("Plan created ✅", "success"); setTimeout(() => (window.location.href = "/plans"), 700); }
      else VS.toast((r.data && r.data.msg) || "Failed to create plan", "error");
    });
  }

  /* =======================  SHOW  ======================= */
  if (page === "plans-show") {
    (async () => {
      const p = await findPlan(document.body.dataset.id);
      if (!p) { VS.toast("Plan not found", "error"); return; }
      document.getElementById("p-title").textContent = p.plan_title;
      document.getElementById("p-type").textContent = p.plan_type || "plan";
      document.getElementById("p-price").textContent = "₹" + p.plan_price;
      document.getElementById("p-per").textContent = "/" + (CYCLE[p.plan_type] || "month");
      document.getElementById("p-added").textContent = "Added " + fmtDate(p.created_at);
      document.getElementById("p-edit-link").href = "/plans/" + p.pid + "/edit";

      document.getElementById("p-del").addEventListener("click", async () => {
        const yes = await VS.confirm({ title: "Delete plan?", message: '"' + p.plan_title + '" will be removed.', confirmText: "Delete", danger: true });
        if (!yes) return;
        const r = await VS.api("/api/deletePlan", { method: "POST", body: { pid: Number(p.pid) } });
        if (r.ok && r.data && r.data.status) { VS.toast("Plan deleted", "success"); setTimeout(() => (window.location.href = "/plans"), 600); }
        else VS.toast((r.data && r.data.msg) || "Delete failed", "error");
      });
    })();
  }

  /* =======================  EDIT  ======================= */
  if (page === "plans-edit") {
    (async () => {
      const p = await findPlan(document.body.dataset.id);
      if (!p) { VS.toast("Plan not found", "error"); return; }
      document.getElementById("plan_title").value = p.plan_title || "";
      document.getElementById("plan_type").value = p.plan_type || "monthly";
      document.getElementById("plan_price").value = p.plan_price || "";
    })();

    document.getElementById("plan-edit-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = {
        pid: Number(document.body.dataset.id),
        plan_title: document.getElementById("plan_title").value.trim(),
        plan_type: document.getElementById("plan_type").value,
        plan_price: Number(document.getElementById("plan_price").value),
      };
      const btn = e.target.querySelector('button[type="submit"]');
      btn.disabled = true;
      const r = await VS.api("/api/updatePlan", { method: "PATCH", body: fd });
      btn.disabled = false;
      if (r.ok && r.data && r.data.status) { VS.toast("Plan updated ✅", "success"); setTimeout(() => (window.location.href = "/plans"), 700); }
      else VS.toast((r.data && r.data.msg) || "Update failed", "error");
    });
  }
})();

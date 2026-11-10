/* Dashboard — KPIs, AI insights, charts, recent activity */
(function () {
  "use strict";
  const { escapeHtml, fmtDate, timeAgo, avatar } = VS.utils;

  const KPIS = {
    bookings: {
      label: "Total Bookings", icon: "bi-calendar-check", from: "from-brand-500", to: "to-violet-600",
      link: "/bookings", linkText: "Manage bookings", delta: (k, g) => g.pct,
    },
    customers: {
      label: "Customers", icon: "bi-people", from: "from-emerald-500", to: "to-teal-600",
      link: "/users", linkText: "Manage accounts", delta: (k) => k.newUsers7d,
    },
    services: {
      label: "Services", icon: "bi-wrench-adjustable", from: "from-amber-500", to: "to-orange-600",
      link: "/services", linkText: "View catalog", delta: null,
    },
    shops: {
      label: "Service Centers", icon: "bi-buildings", from: "from-rose-500", to: "to-pink-600",
      link: "/shops", linkText: "Manage centers", delta: null,
    },
  };

  const charts = { trend: null, types: null, cities: null };

  function setKpi(key, value, deltaText, deltaCls) {
    const card = document.querySelector('.kpi-card[data-kpi="' + key + '"]');
    if (!card) return;
    const cfg = KPIS[key];
    card.querySelector(".kpi-label").textContent = cfg.label;
    card.querySelector(".kpi-value").textContent = value;
    const d = card.querySelector(".kpi-delta");
    d.className = "kpi-delta mt-1.5 text-xs font-semibold " + deltaCls;
    d.textContent = deltaText;
    const icon = card.querySelector(".kpi-icon");
    icon.className = "kpi-icon grid h-11 w-11 place-items-center rounded-2xl text-xl text-white shadow-lg bg-gradient-to-br " + cfg.from + " " + cfg.to;
    icon.innerHTML = '<i class="bi ' + cfg.icon + '"></i>';
    const link = card.querySelector(".kpi-link");
    link.href = cfg.link;
    link.querySelector(".kpi-link-text").textContent = cfg.linkText;
  }

  const INSIGHT_STYLES = {
    positive: { icon: "bi-graph-up-arrow", cls: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300", title: "text-emerald-600 dark:text-emerald-300" },
    warning: { icon: "bi-exclamation-triangle", cls: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300", title: "text-amber-600 dark:text-amber-300" },
    info: { icon: "bi-lightbulb", cls: "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300", title: "text-brand-600 dark:text-brand-300" },
    neutral: { icon: "bi-activity", cls: "bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300", title: "text-sky-600 dark:text-sky-300" },
  };

  function renderInsights(data) {
    const list = document.getElementById("insights-list");
    const meta = document.getElementById("insights-meta");
    const engine = document.getElementById("insights-engine");
    if (!list) return;
    if (meta) meta.textContent = "Generated " + timeAgo(data.generatedAt) + " · " + (data.kpis.bookings || 0) + " bookings analyzed";
    if (engine) engine.textContent = data.engine === "gemini" ? "Gemini AI" : "Smart Analytics";

    const items = (data.insights || []).slice(0, 6);
    list.innerHTML = items.length
      ? items
          .map((it) => {
            const s = INSIGHT_STYLES[it.type] || INSIGHT_STYLES.neutral;
            return (
              '<div class="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/40">' +
              '<div class="grid h-9 w-9 shrink-0 place-items-center rounded-xl ' + s.cls + '"><i class="bi ' + (it.icon || s.icon) + '"></i></div>' +
              "<div><h4 class=\"text-sm font-bold " + s.title + '">' + escapeHtml(it.title) + "</h4>" +
              '<p class="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">' + escapeHtml(it.detail) + "</p></div></div>"
            );
          })
          .join("")
      : '<p class="col-span-full py-6 text-center text-sm text-slate-400">No insights available yet — add some data first.</p>';
  }

  function chartTheme() {
    const dark = document.documentElement.classList.contains("dark");
    return {
      text: dark ? "#94a3b8" : "#64748b",
      grid: dark ? "rgba(148,163,184,0.1)" : "rgba(100,116,139,0.1)",
    };
  }

  function renderCharts(data) {
    if (typeof Chart === "undefined") return;
    const th = chartTheme();

    /* Trend line */
    const trendData = (data.charts.trend || []).map((t) => t.count);
    const trendLabels = (data.charts.trend || []).map((t) => String(t.day).trim());
    const total = trendData.reduce((a, b) => a + b, 0);
    const badge = document.getElementById("trend-badge");
    if (badge) {
      badge.textContent = data.growth.pct > 0 ? "▲ " + data.growth.pct + "% vs last week" : data.growth.pct < 0 ? "▼ " + Math.abs(data.growth.pct) + "% vs last week" : "Steady";
      badge.className = data.growth.pct >= 0 ? "badge-green" : "badge-red";
    }

    if (charts.trend) charts.trend.destroy();
    charts.trend = new Chart(document.getElementById("chart-trend"), {
      type: "line",
      data: {
        labels: trendLabels,
        datasets: [
          {
            label: "Bookings",
            data: trendData,
            borderColor: "#6366f1",
            backgroundColor: "rgba(99,102,241,0.12)",
            fill: true,
            tension: 0.42,
            borderWidth: 2.5,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: "#6366f1",
            pointBorderColor: "#fff",
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: "#0f172a", padding: 12, cornerRadius: 10, displayColors: false },
        },
        scales: {
          x: { ticks: { color: th.text }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { color: th.text, precision: 0 }, grid: { color: th.grid } },
        },
      },
    });

    /* Vehicle types doughnut */
    const types = data.charts.vehicleTypes || [];
    if (charts.types) charts.types.destroy();
    charts.types = new Chart(document.getElementById("chart-types"), {
      type: "doughnut",
      data: {
        labels: types.map((t) => t.vehicle_type || "Unknown"),
        datasets: [
          {
            data: types.map((t) => t.count),
            backgroundColor: ["#6366f1", "#8b5cf6", "#06b6d4", "#f59e0b", "#10b981", "#f43f5e"],
            borderWidth: 3,
            borderColor: document.documentElement.classList.contains("dark") ? "#0f172a" : "#fff",
            hoverOffset: 8,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: { position: "bottom", labels: { color: th.text, boxWidth: 10, boxHeight: 10, borderRadius: 5, useBorderRadius: true, padding: 14 } },
          tooltip: { backgroundColor: "#0f172a", padding: 12, cornerRadius: 10 },
        },
      },
    });

    /* Cities bar */
    const cities = data.charts.cities || [];
    if (charts.cities) charts.cities.destroy();
    charts.cities = new Chart(document.getElementById("chart-cities"), {
      type: "bar",
      data: {
        labels: cities.map((c) => c.city || "Unknown"),
        datasets: [
          {
            label: "Centers",
            data: cities.map((c) => c.count),
            backgroundColor: "#10b981",
            hoverBackgroundColor: "#059669",
            borderRadius: 10,
            borderSkipped: false,
            maxBarThickness: 46,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { backgroundColor: "#0f172a", padding: 12, cornerRadius: 10, displayColors: false },
        },
        scales: {
          x: { ticks: { color: th.text }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { color: th.text, precision: 0 }, grid: { color: th.grid } },
        },
      },
    });
  }

  function renderRecent(data) {
    const rb = document.getElementById("recent-bookings");
    if (rb) {
      const bookings = ((data.recent || {}).bookings || []).slice(0, 5);
      rb.innerHTML = bookings.length
        ? bookings
            .map(
              (b) =>
                "<tr>" +
                '<td><div class="flex items-center gap-3">' + avatar({ name: b.user_name || "Unknown", photo: null }) +
                '<div><div class="text-sm font-semibold text-slate-800 dark:text-slate-100">' + escapeHtml(b.user_name || "Unknown") + "</div>" +
                '<div class="text-xs text-slate-400">' + escapeHtml(b.registration_no || "") + "</div></div></div></td>" +
                '<td><span class="badge-slate">' + escapeHtml(b.vehicle_name || "—") + '</span> <span class="text-xs text-slate-400">' + escapeHtml(b.vehicle_type || "") + "</span></td>" +
                '<td class="text-sm font-medium text-slate-600 dark:text-slate-300">' + escapeHtml(b.service_name || "—") + "</td>" +
                '<td><div class="text-xs font-semibold text-slate-700 dark:text-slate-200">' + fmtDate(b.slot_date) + '</div><div class="text-xs text-slate-400">' + escapeHtml(b.slot_time || "") + "</div></td>" +
                '<td class="text-right"><a href="/bookings/' + b.book_id + '" class="btn-secondary btn-sm"><i class="bi bi-eye"></i></a></td>' +
                "</tr>"
            )
            .join("")
        : VS.utils.emptyRow(5, "bi-calendar-x", "No bookings yet");
    }

    const ru = document.getElementById("recent-users");
    if (ru) {
      const users = ((data.recent || {}).users || []).slice(0, 4);
      ru.innerHTML = users.length
        ? users
            .map(
              (u) =>
                '<a href="/users/' + u.id + '" class="flex items-center gap-3 px-5 py-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/50">' +
                avatar(u) +
                '<div class="min-w-0 flex-1"><div class="truncate text-sm font-bold text-slate-800 dark:text-slate-100">' + escapeHtml(u.name) + "</div>" +
                '<div class="text-xs text-slate-400">' + escapeHtml(String(u.phone)) + "</div></div>" +
                '<div class="text-right"><span class="' + (u.role === "admin" ? "badge-blue" : "badge-green") + '">' + escapeHtml(u.role) + "</span>" +
                '<div class="mt-1 text-[10px] text-slate-400">' + timeAgo(u.created_at) + "</div></div></a>"
            )
            .join("")
        : '<p class="px-5 py-8 text-center text-sm text-slate-400">No users yet</p>';
    }
  }

  async function loadDashboard() {
    const r = await VS.api("/api/ai/insights");
    if (!r.ok || !r.data || !r.data.status) {
      VS.toast((r.data && r.data.msg) || "Failed to load dashboard data", "error");
      document.getElementById("insights-list").innerHTML =
        '<p class="col-span-full py-6 text-center text-sm text-rose-500">Dashboard data unavailable — check your API & database.</p>';
      return;
    }
    const d = r.data;
    const k = d.kpis;

    setKpi("bookings", k.bookings, (d.growth.pct > 0 ? "▲ " : "▼ ") + Math.abs(d.growth.pct) + "% vs last week", d.growth.pct >= 0 ? "text-emerald-500" : "text-rose-500");
    setKpi("customers", k.customers, k.newUsers7d > 0 ? "+ " + k.newUsers7d + " joined this week" : "No new signups this week", k.newUsers7d > 0 ? "text-emerald-500" : "text-slate-400");
    setKpi("services", k.services, k.categories + " categories", "text-slate-400");
    setKpi("shops", k.shops, (d.charts.cities || []).length + " cities covered", "text-slate-400");

    renderInsights(d);
    renderCharts(d);
    renderRecent(d);

    const updated = document.getElementById("dash-updated");
    if (updated) updated.textContent = "Updated " + new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (!VS.session.isLoggedIn) return;
    loadDashboard();

    const refresh = document.getElementById("dash-refresh");
    if (refresh)
      refresh.addEventListener("click", () => {
        refresh.querySelector("i").classList.add("animate-spin");
        loadDashboard().finally(() => refresh.querySelector("i").classList.remove("animate-spin"));
      });

    const ask = document.getElementById("dash-ask-ai");
    if (ask)
      ask.addEventListener("click", () => {
        VS.openCopilot();
        VS.copilotAsk("Give me a weekly summary with key metrics and suggestions");
      });
  });
})();

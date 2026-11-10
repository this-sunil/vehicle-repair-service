/* ==========================================================================
 * VehicleService Admin — Core Framework
 * session · api client · toasts · modals · sidebar · theme · command palette
 * · AI copilot · badges · auth guard
 * ========================================================================== */
(function () {
  "use strict";

  const LS = {
    token: "vs_token",
    user: "vs_user",
    theme: "vs_theme",
    collapsed: "vs_sidebar_collapsed",
  };

  /* ------------------------------------------------------------------ */
  /* Session                                                             */
  /* ------------------------------------------------------------------ */
  const session = {
    get token() {
      try { return localStorage.getItem(LS.token) || ""; } catch { return ""; }
    },
    get user() {
      try { return JSON.parse(localStorage.getItem(LS.user) || "null"); } catch { return null; }
    },
    set(token, user) {
      try {
        localStorage.setItem(LS.token, token);
        localStorage.setItem(LS.user, JSON.stringify(user || {}));
      } catch {}
    },
    clear() {
      try {
        localStorage.removeItem(LS.token);
        localStorage.removeItem(LS.user);
      } catch {}
    },
    get isLoggedIn() { return !!session.token; },
  };

  function logout(message) {
    session.clear();
    if (message) {
      try { sessionStorage.setItem("vs_logout_msg", message); } catch {}
    }
    window.location.href = "/login";
  }

  async function refreshToken() {
    const user = session.user;
    if (!user || !user.id) return null;
    try {
      const res = await fetch("/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id }),
      });
      const data = await res.json();
      if (data && data.status && data.token) {
        try { localStorage.setItem(LS.token, data.token); } catch {}
        return data.token;
      }
    } catch {}
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* API client                                                          */
  /* ------------------------------------------------------------------ */
  async function api(path, opts) {
    const o = Object.assign({ method: "GET", body: null, multipart: false, auth: true, raw: false }, opts);

    /* Signed out — the auth guard is already redirecting to /login;
       fail gracefully instead of firing doomed 401 requests. */
    if (o.auth && !session.token) {
      if (o.raw) throw new Error("NOT_AUTHENTICATED");
      return { ok: false, status: 401, data: null, authExpired: true };
    }

    const doFetch = (token) => {
      const headers = {};
      if (o.auth && token) headers["Authorization"] = "Bearer " + token;
      if (o.body && !o.multipart) headers["Content-Type"] = "application/json";
      return fetch(path, {
        method: o.method,
        headers,
        body: o.body ? (o.multipart ? o.body : JSON.stringify(o.body)) : undefined,
      });
    };

    let res;
    try {
      res = await doFetch(session.token);
      if (res.status === 401 && o.auth) {
        const fresh = await refreshToken();
        if (fresh) res = await doFetch(fresh);
        else { logout("Session expired. Please sign in again."); throw new Error("AUTH_EXPIRED"); }
      }
    } catch (err) {
      if (err && err.message === "AUTH_EXPIRED") {
        /* logout() already redirects — fail gracefully, no console noise */
        if (o.raw) throw err;
        return { ok: false, status: 401, data: null, authExpired: true };
      }
      if (o.raw) throw err;
      return { ok: false, status: 0, data: null, networkError: true };
    }

    if (o.raw) return res;
    const ct = (res.headers.get("content-type") || "");
    let data = null;
    if (ct.includes("application/json")) data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  }

  /* ------------------------------------------------------------------ */
  /* Utils                                                               */
  /* ------------------------------------------------------------------ */
  const escapeHtml = (s) =>
    String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const initials = (name) => {
    const parts = String(name || "A").trim().split(/\s+/);
    return ((parts[0] || "A")[0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
  };

  const fmtDate = (d) => {
    if (!d) return "—";
    const dt = new Date(d);
    if (isNaN(dt)) return String(d);
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const timeAgo = (d) => {
    if (!d) return "—";
    const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
    if (isNaN(s)) return String(d);
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    if (s < 2592000) return Math.floor(s / 86400) + "d ago";
    return fmtDate(d);
  };

  const debounce = (fn, ms) => {
    let t;
    const d = function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms || 300); };
    d.cancel = () => clearTimeout(t);
    return d;
  };

  function avatar(user, cls) {
    const photo = user && (user.photo || user.user_photo);
    const c = cls || "h-9 w-9";
    if (photo && /^(https?:)?\/\//.test(photo)) {
      return (
        '<img src="' + escapeHtml(photo) + '" alt="' + escapeHtml(user.name || "User") +
        '" class="' + c + ' shrink-0 rounded-xl object-cover ring-2 ring-white/70 dark:ring-slate-800" ' +
        'onerror="this.outerHTML=\'&lt;div class=&quot;' + c + ' shrink-0 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 grid place-items-center text-xs font-bold text-white&quot;&gt;' + escapeHtml(initials(user && user.name)) + '&lt;/div&gt;">'
      );
    }
    return (
      '<div class="' + c + ' grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-xs font-bold text-white">' +
      escapeHtml(initials(user && (user.name || user.user_name))) + "</div>"
    );
  }

  function emptyRow(colspan, icon, msg) {
    return (
      '<tr><td colspan="' + colspan + '" class="!px-4 !py-16 text-center">' +
      '<div class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 dark:bg-slate-800"><i class="bi ' + (icon || "bi-inbox") + ' text-2xl text-slate-400"></i></div>' +
      '<p class="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">' + escapeHtml(msg || "No records found") + "</p>" +
      "</td></tr>"
    );
  }

  /* CSV cell: quote + escape quotes, keep on one line */
  const csvCell = (v) => {
    const s = String(v == null ? "" : v).replace(/"/g, '""').replace(/\r?\n/g, " ");
    return '"' + s + '"';
  };

  /**
   * Build & download a CSV from an array of objects.
   * columns: array of keys (or { key, label }) — defaults to all keys of first row.
   */
  function exportCSV(filename, columns, rows) {
    if (!rows || !rows.length) return false;
    const cols = (columns && columns.length
      ? columns
      : Object.keys(rows[0])
    ).map((c) => (typeof c === "object" ? c : { key: c, label: c }));
    const header = cols.map((c) => csvCell(c.label)).join(",");
    const body = rows
      .map((r) => cols.map((c) => csvCell(r[c.key])).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + header + "\n" + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "export.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  }

  const fmtMoney = (v) => {
    const n = Number(v);
    return isNaN(n) ? String(v == null ? "" : v) : "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  };

  /* ------------------------------------------------------------------ */
  /* Toasts                                                              */
  /* ------------------------------------------------------------------ */
  const TOAST_ICONS = {
    success: { i: "bi-check-circle-fill", c: "text-emerald-500" },
    error: { i: "bi-x-circle-fill", c: "text-rose-500" },
    warning: { i: "bi-exclamation-triangle-fill", c: "text-amber-500" },
    info: { i: "bi-info-circle-fill", c: "text-brand-500" },
  };

  function toast(msg, type, ms) {
    const host = document.getElementById("vs-toasts");
    if (!host) { alert(String(msg)); return; }
    const t = TOAST_ICONS[type] || TOAST_ICONS.info;
    const el = document.createElement("div");
    el.className =
      "pointer-events-auto flex items-start gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3.5 pr-4 shadow-lg backdrop-blur animate-fadeUp dark:border-slate-700 dark:bg-slate-900/95";
    el.innerHTML =
      '<i class="bi ' + t.i + " " + t.c + ' text-lg leading-none"></i>' +
      '<p class="flex-1 pt-0.5 text-sm font-medium text-slate-700 dark:text-slate-200">' + escapeHtml(msg) + "</p>" +
      '<button class="mt-0.5 text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"><i class="bi bi-x-lg text-xs"></i></button>';
    const kill = () => {
      el.style.transition = "all .25s";
      el.style.opacity = "0";
      el.style.transform = "translateX(1rem)";
      setTimeout(() => el.remove(), 250);
    };
    el.querySelector("button").addEventListener("click", kill);
    host.appendChild(el);
    setTimeout(kill, ms || 4200);
  }

  /* ------------------------------------------------------------------ */
  /* Modal / Confirm                                                     */
  /* ------------------------------------------------------------------ */
  function modal(opts) {
    const o = Object.assign({ title: "", body: "", size: "max-w-lg" }, opts);
    const wrap = document.createElement("div");
    wrap.className = "fixed inset-0 z-[90] grid place-items-center p-4";
    wrap.innerHTML =
      '<div class="absolute inset-0 bg-slate-950/60 backdrop-blur-sm" data-close></div>' +
      '<div class="card relative w-full ' + o.size + ' animate-scaleIn overflow-hidden shadow-2xl">' +
      '<div class="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">' +
      '<h3 class="text-base font-bold text-slate-900 dark:text-white">' + escapeHtml(o.title) + "</h3>" +
      '<button class="icon-btn" data-close aria-label="Close"><i class="bi bi-x-lg"></i></button>' +
      "</div>" +
      '<div class="vs-scrollbar max-h-[70vh] overflow-y-auto p-5">' + o.body + "</div>" +
      "</div>";
    const close = () => { wrap.style.opacity = "0"; setTimeout(() => wrap.remove(), 150); };
    wrap.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));
    document.body.appendChild(wrap);
    if (o.onMount) o.onMount(wrap, close);
    return close;
  }

  function confirmDialog(opts) {
    const o = Object.assign({ title: "Are you sure?", message: "", confirmText: "Confirm", danger: false }, opts);
    return new Promise((resolve) => {
      const close = modal({
        title: o.title,
        size: "max-w-md",
        body:
          '<p class="text-sm leading-relaxed text-slate-600 dark:text-slate-300">' + escapeHtml(o.message) + "</p>" +
          '<div class="mt-6 flex justify-end gap-2.5">' +
          '<button class="btn-secondary btn-md" data-no>Cancel</button>' +
          '<button class="' + (o.danger ? "btn-danger" : "btn-primary") + ' btn-md" data-yes>' + escapeHtml(o.confirmText) + "</button>" +
          "</div>",
        onMount(root, close) {
          root.querySelector("[data-no]").addEventListener("click", () => { close(); resolve(false); });
          root.querySelector("[data-yes]").addEventListener("click", () => { close(); resolve(true); });
        },
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Pagination                                                          */
  /* ------------------------------------------------------------------ */
  function pagination(state) {
    const root = document.getElementById("vs-pag");
    if (!root) return;
    const total = Math.max(1, state.totalPages || 1);
    const page = Math.min(Math.max(1, state.page || 1), total);
    const info = root.querySelector("[data-pag-info]");
    const label = root.querySelector("[data-pag-label]");
    const prev = root.querySelector("[data-pag-prev]");
    const next = root.querySelector("[data-pag-next]");

    if (info) info.textContent = state.total != null
      ? "Showing page " + page + " of " + total + " · " + state.total + " record" + (state.total === 1 ? "" : "s")
      : "Page " + page + " of " + total;
    if (label) label.textContent = page + " / " + total;
    if (prev) prev.disabled = page <= 1;
    if (next) next.disabled = page >= total;

    const prevClone = prev && prev.cloneNode(true);
    const nextClone = next && next.cloneNode(true);
    if (prev && prevClone) {
      prev.replaceWith(prevClone);
      prevClone.addEventListener("click", () => page > 1 && state.onChange(page - 1));
    }
    if (next && nextClone) {
      next.replaceWith(nextClone);
      nextClone.addEventListener("click", () => page < total && state.onChange(page + 1));
    }
  }

  /* ------------------------------------------------------------------ */
  /* Command palette                                                     */
  /* ------------------------------------------------------------------ */
  const CMD_ITEMS = [
    { icon: "bi-speedometer2", label: "Dashboard", kind: "page", go: "/dashboard" },
    { icon: "bi-calendar-check", label: "Bookings", kind: "page", go: "/bookings", k: "appointments slots" },
    { icon: "bi-calendar-plus", label: "New Booking", kind: "action", go: "/bookings/create", k: "create add appointment" },
    { icon: "bi-wrench-adjustable", label: "Services", kind: "page", go: "/services", k: "repairs catalog" },
    { icon: "bi-tools", label: "New Service", kind: "action", go: "/services/create", k: "create add repair" },
    { icon: "bi-grid-3x3-gap", label: "Categories", kind: "page", go: "/categories", k: "vehicle types" },
    { icon: "bi-grid-1x2", label: "New Category", kind: "action", go: "/categories/create", k: "create add" },
    { icon: "bi-buildings", label: "Shops & Centers", kind: "page", go: "/shops", k: "garages locations" },
    { icon: "bi-building-add", label: "New Service Center", kind: "action", go: "/shops/create", k: "create add garage" },
    { icon: "bi-people", label: "Users", kind: "page", go: "/users", k: "customers accounts" },
    { icon: "bi-person-plus", label: "New User", kind: "action", go: "/users/create", k: "create add register customer" },
    { icon: "bi-credit-card-2-front", label: "Subscription Plans", kind: "page", go: "/plans", k: "pricing tiers" },
    { icon: "bi-plus-square", label: "New Plan", kind: "action", go: "/plans/create", k: "create add subscription" },
    { icon: "bi-megaphone", label: "Broadcasts", kind: "page", go: "/notifications", k: "notifications alerts" },
    { icon: "bi-send-plus", label: "Send Broadcast", kind: "action", go: "/notifications/create", k: "create add notification push" },
    { icon: "bi-clock-history", label: "Activity Log", kind: "page", go: "/activity", k: "audit history who did what" },
    { icon: "bi-person-circle", label: "My Profile", kind: "page", go: "/admin/profile" },
    { icon: "bi-gear", label: "Settings", kind: "page", go: "/admin/settings" },
    { icon: "bi-stars", label: "Ask AI Copilot…", kind: "ai", k: "chat assistant question help" },
    { icon: "bi-graph-up", label: "AI: Weekly summary", kind: "ai-q", q: "Weekly summary", k: "report stats trend" },
    { icon: "bi-lightbulb", label: "AI: Business suggestions", kind: "ai-q", q: "Business suggestions", k: "ideas recommendations advice" },
    { icon: "bi-box-arrow-right", label: "Sign Out", kind: "ai-logout", k: "logout exit" },
  ];

  function openCmdk() {
    const k = document.getElementById("vs-cmdk");
    if (!k) return;
    k.classList.remove("hidden");
    const input = document.getElementById("vs-cmdk-input");
    input.value = "";
    renderCmdkList("");
    input.focus();
  }

  function closeCmdk() {
    const k = document.getElementById("vs-cmdk");
    if (k) k.classList.add("hidden");
  }

  function renderCmdkList(q) {
    const list = document.getElementById("vs-cmdk-list");
    if (!list) return;
    const lower = q.toLowerCase().trim();
    let items = CMD_ITEMS.filter(
      (it) => !lower || (it.label + " " + (it.k || "")).toLowerCase().includes(lower)
    );

    // Free-text question → offer it to the AI
    if (lower && !items.some((i) => i.kind === "ai-q" && i.q.toLowerCase() === lower)) {
      items = [
        { icon: "bi-stars", label: 'Ask AI: "' + q.trim() + '"', kind: "ai-q", q: q.trim(), k: q },
      ].concat(items);
    }

    /* Global data search — live results from users/bookings/… */
    if (lower.length >= 2 && session.isLoggedIn) {
      cmdkSearch(lower);
    } else {
      cmdkSearch.cancel && cmdkSearch.cancel();
      lastSearchResults = null;
    }
    items = items.concat(buildSearchItems());

    list.innerHTML = items.length
      ? items
          .map(
            (it, idx) =>
              (it.heading
                ? '<div class="cmdk-heading px-3 pb-1 pt-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">' + escapeHtml(it.heading) + "</div>"
                : "") +
              '<button class="cmdk-item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ' +
              (idx === 0 ? "bg-brand-50 dark:bg-brand-500/10" : "hover:bg-slate-100 dark:hover:bg-slate-800") +
              '" data-idx="' + idx + '">' +
              '<i class="bi ' + it.icon + ' text-lg text-brand-500"></i>' +
              '<span class="flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">' + escapeHtml(it.label) + "</span>" +
              (it.sub ? '<span class="max-w-40 truncate text-xs text-slate-400">' + escapeHtml(it.sub) + "</span>" : "") +
              (it.kind === "ai-q" ? '<span class="badge-blue">AI</span>' : '<i class="bi bi-arrow-return-left text-xs text-slate-300"></i>') +
              "</button>"
          )
          .join("")
      : '<p class="px-3 py-8 text-center text-sm text-slate-400">No matches — try asking the AI instead ✨</p>';

    list._items = items;
    list.querySelectorAll(".cmdk-item").forEach((btn) =>
      btn.addEventListener("click", () => {
        const it = list._items[Number(btn.dataset.idx)];
        closeCmdk();
        runCmd(it);
      })
    );
  }

  /* Debounced live search feeding the command palette */
  let lastSearchResults = null;
  const cmdkSearch = debounce(async (q) => {
    try {
      const r = await api("/api/search?q=" + encodeURIComponent(q) + "&limit=4");
      lastSearchResults = r.ok && r.data && r.data.status ? r.data.result || {} : null;
      // re-render if the palette is still open with the same query
      const input = document.getElementById("vs-cmdk-input");
      const k = document.getElementById("vs-cmdk");
      if (input && k && !k.classList.contains("hidden") && input.value.toLowerCase().trim() === q)
        renderCmdkList(input.value);
    } catch {}
    return null;
  }, 250);

  function buildSearchItems() {
    const r = lastSearchResults;
    if (!r) return [];
    const out = [];
    const add = (heading, arr, icon, label, sub, go) => {
      if (!arr || !arr.length) return;
      out.push({ heading });
      arr.slice(0, 4).forEach((x) =>
        out.push({ icon, kind: "data", label: label(x), sub: sub ? sub(x) : "", go: go(x) })
      );
    };
    add("Users", r.users, "bi-person", (x) => x.name, (x) => String(x.phone), (x) => "/users/" + x.id);
    add("Bookings", r.bookings, "bi-calendar-check", (x) => x.vehicle_name + " · " + x.registration_no, (x) => (x.service_name || "") + " · " + (x.slot_date || ""), (x) => "/bookings/" + x.book_id);
    add("Services", r.services, "bi-wrench-adjustable", (x) => x.title, () => "service", (x) => "/services/" + x.id);
    add("Categories", r.categories, "bi-grid-3x3-gap", (x) => x.title, (x) => x.vehicle_type || "", (x) => "/categories/" + x.cid);
    add("Service Centers", r.shops, "bi-buildings", (x) => x.shopName, (x) => x.city || "", (x) => "/shops/" + x.sid);
    add("Plans", r.plans, "bi-credit-card-2-front", (x) => x.plan_title, (x) => "₹" + x.plan_price, (x) => "/plans/" + x.pid);
    add("Broadcasts", r.notifications, "bi-megaphone", (x) => x.title, () => "broadcast", (x) => "/notifications/" + x.id);
    return out;
  }

  function runCmd(it) {
    if (!it) return;
    if (it.go) window.location.href = it.go;
    else if (it.kind === "ai") openCopilot();
    else if (it.kind === "ai-q") { openCopilot(); setTimeout(() => copilotAsk(it.q), 350); }
    else if (it.kind === "ai-logout") doLogout();
  }

  async function doLogout() {
    const yes = await confirmDialog({
      title: "Sign out?",
      message: "You will be returned to the login screen.",
      confirmText: "Sign Out",
      danger: true,
    });
    if (yes) logout();
  }

  /* ------------------------------------------------------------------ */
  /* AI Copilot                                                          */
  /* ------------------------------------------------------------------ */
  let cpOpen = false;

  function openCopilot() {
    const cp = document.getElementById("vs-copilot");
    if (!cp) return;
    cpOpen = true;
    cp.classList.remove("pointer-events-none", "translate-y-3", "scale-95", "opacity-0");
    const msgs = document.getElementById("vs-cp-messages");
    if (msgs && !msgs.childElementCount) {
      addCpBot(
        "Hello! I'm your **AI copilot** — I can see your live bookings, customers, services and centers.\n" +
        "Try *\"weekly summary\"* or *\"business suggestions\"* — or just ask anything. ✨"
      );
    }
    const inp = document.getElementById("vs-cp-input");
    if (inp) setTimeout(() => inp.focus(), 250);
  }

  function closeCopilot() {
    const cp = document.getElementById("vs-copilot");
    if (!cp) return;
    cpOpen = false;
    cp.classList.add("pointer-events-none", "translate-y-3", "scale-95", "opacity-0");
  }

  function renderMd(text) {
    let s = escapeHtml(text);
    s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");
    s = s.replace(/\n/g, "<br>");
    return s;
  }

  function addCpBot(html, raw) {
    const msgs = document.getElementById("vs-cp-messages");
    if (!msgs) return;
    const el = document.createElement("div");
    el.className = "cp-msg-bot animate-fadeUp";
    el.innerHTML = raw ? html : renderMd(html);
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
    return el;
  }

  function addCpUser(text) {
    const msgs = document.getElementById("vs-cp-messages");
    if (!msgs) return;
    const el = document.createElement("div");
    el.className = "cp-msg-user animate-fadeUp";
    el.textContent = text;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
  }

  async function copilotAsk(q) {
    const msgs = document.getElementById("vs-cp-messages");
    if (!msgs || !q) return;
    addCpUser(q);
    const suggests = document.getElementById("vs-cp-suggests");
    if (suggests) suggests.classList.add("hidden");

    const typing = addCpBot(
      '<span class="typing-dot"></span><span class="typing-dot" style="animation-delay:.2s"></span><span class="typing-dot" style="animation-delay:.4s"></span>',
      true
    );

    try {
      const r = await api("/api/ai/chat", { method: "POST", body: { message: q } });
      typing.remove();
      if (r.ok && r.data && r.data.status) {
        addCpBot(r.data.reply);
        const eng = document.getElementById("vs-cp-engine");
        if (eng) eng.textContent = (r.data.engine === "gemini" ? "Gemini connected" : "Online · data-aware");
      } else {
        addCpBot("⚠️ " + ((r.data && r.data.msg) || "Copilot hit a snag. Please try again."));
      }
    } catch (e) {
      typing.remove();
      addCpBot("⚠️ Copilot is unreachable right now.");
    }
    if (suggests) suggests.classList.remove("hidden");
  }

  /* ------------------------------------------------------------------ */
  /* Dynamic badges (single insights call)                               */
  /* ------------------------------------------------------------------ */
  async function loadBadges() {
    if (!session.isLoggedIn) return;
    const r = await api("/api/ai/insights");
    if (!r.ok || !r.data || !r.data.status) return;
    const k = r.data.kpis || {};
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set("badgeBookingCount", k.bookings || 0);
    set("badgeUserCount", k.customers || 0);
    set("badgeCategoryCount", k.categories || 0);
    set("badgeShopCount", k.shops || 0);
    set("badgeNotificationCount", k.notifications || 0);

    const bell = document.getElementById("vs-bell-count");
    const bellBadge = document.getElementById("vs-bell-badge");
    const alerts = (k.bookingsToday || 0) + (k.newUsers7d || 0);
    if (bell) bell.textContent = alerts;
    if (bellBadge) bellBadge.textContent = alerts;
    const list = document.getElementById("vs-bell-list");
    if (list) {
      const items = [];
      if (k.bookingsToday > 0)
        items.push({ icon: "bi-calendar-check", cls: "text-brand-500", t: k.bookingsToday + " appointment(s) today", s: k.bookingsUpcoming + " upcoming in pipeline", go: "/bookings" });
      if (k.newUsers7d > 0)
        items.push({ icon: "bi-person-plus", cls: "text-emerald-500", t: k.newUsers7d + " new customers this week", s: "Total base: " + k.customers, go: "/users" });
      if (!items.length)
        items.push({ icon: "bi-emoji-smile", cls: "text-slate-400", t: "All quiet right now", s: "No appointments or signups today", go: "/dashboard" });
      list.innerHTML = items
        .map(
          (a) =>
            '<a href="' + a.go + '" class="flex items-start gap-2.5 rounded-xl px-3 py-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-800">' +
            '<i class="bi ' + a.icon + " mt-0.5 " + a.cls + '"></i>' +
            "<div><div class=\"text-sm font-semibold text-slate-700 dark:text-slate-200\">" + a.t + "</div>" +
            '<div class="text-xs text-slate-400">' + a.s + "</div></div></a>"
        )
        .join("");
    }
  }

  /* ------------------------------------------------------------------ */
  /* Bootstrap                                                           */
  /* ------------------------------------------------------------------ */
  function fillUser() {
    const u = session.user;
    if (!u) return;
    document.querySelectorAll(".admin-user-name").forEach((el) => (el.textContent = u.name || "Administrator"));
    document.querySelectorAll(".admin-user-role").forEach((el) => (el.textContent = u.role === "admin" ? "Super Admin" : u.role || "User"));
    if (u.photo && /^https?:|^\/upload/.test(u.photo)) {
      document.querySelectorAll(".admin-user-avatar").forEach((el) => {
        el.outerHTML = '<img src="' + escapeHtml(u.photo) + '" class="admin-user-avatar h-9 w-9 rounded-xl object-cover" alt="">';
      });
    } else {
      document.querySelectorAll(".admin-user-avatar").forEach((el) => (el.textContent = initials(u.name)));
    }
  }

  function initShell() {
    /* ---- sidebar ---- */
    const sidebar = document.getElementById("vs-sidebar");
    const overlay = document.getElementById("vs-sidebar-overlay");

    const openMobile = () => {
      sidebar.classList.remove("-translate-x-full");
      if (overlay) overlay.classList.remove("hidden");
    };
    const closeMobile = () => {
      sidebar.classList.add("-translate-x-full");
      if (overlay) overlay.classList.add("hidden");
    };

    const openBtn = document.getElementById("vs-sidebar-open");
    if (openBtn) openBtn.addEventListener("click", openMobile);
    const closeBtn = document.getElementById("vs-sidebar-close");
    if (closeBtn) closeBtn.addEventListener("click", closeMobile);
    if (overlay) overlay.addEventListener("click", closeMobile);

    const collapseBtn = document.getElementById("vs-sidebar-collapse");
    if (collapseBtn)
      collapseBtn.addEventListener("click", () => {
        const collapsed = document.body.classList.toggle("vs-collapsed");
        try { localStorage.setItem(LS.collapsed, collapsed ? "1" : ""); } catch {}
      });
    try {
      if (localStorage.getItem(LS.collapsed) === "1") document.body.classList.add("vs-collapsed");
    } catch {}

    /* ---- theme ---- */
    const themeBtn = document.getElementById("vs-theme-toggle");
    if (themeBtn)
      themeBtn.addEventListener("click", () => {
        const dark = document.documentElement.classList.toggle("dark");
        try { localStorage.setItem(LS.theme, dark ? "dark" : "light"); } catch {}
      });

    /* ---- dropdowns ---- */
    document.querySelectorAll("[data-dd]").forEach((dd) => {
      const toggle = dd.querySelector("[data-dd-toggle]");
      const menu = dd.querySelector(".dropdown-menu");
      if (!toggle || !menu) return;
      toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        document.querySelectorAll(".dropdown-menu").forEach((m) => { if (m !== menu) m.classList.add("hidden"); });
        menu.classList.toggle("hidden");
      });
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest("[data-dd]"))
        document.querySelectorAll(".dropdown-menu").forEach((m) => m.classList.add("hidden"));
    });

    /* ---- logout ---- */
    document.querySelectorAll("[data-logout]").forEach((b) => b.addEventListener("click", doLogout));

    /* ---- command palette ---- */
    const cmdTrigger = document.getElementById("vs-cmd-trigger");
    const cmdTriggerMobile = document.getElementById("vs-cmd-trigger-mobile");
    if (cmdTrigger) cmdTrigger.addEventListener("click", openCmdk);
    if (cmdTriggerMobile) cmdTriggerMobile.addEventListener("click", openCmdk);
    const cmdk = document.getElementById("vs-cmdk");
    if (cmdk) cmdk.querySelectorAll("[data-cmdk-close]").forEach((b) => b.addEventListener("click", closeCmdk));
    const cmdkInput = document.getElementById("vs-cmdk-input");
    if (cmdkInput)
      cmdkInput.addEventListener("input", debounce(() => renderCmdkList(cmdkInput.value), 80));

    document.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const k = document.getElementById("vs-cmdk");
        if (k && !k.classList.contains("hidden")) closeCmdk();
        else openCmdk();
      }
      if (e.key === "Escape") {
        closeCmdk();
        closeCopilot();
      }
    });

    /* ---- copilot ---- */
    const fab = document.getElementById("vs-copilot-fab");
    if (fab) fab.addEventListener("click", () => (cpOpen ? closeCopilot() : openCopilot()));
    const cpClose = document.getElementById("vs-copilot-close");
    if (cpClose) cpClose.addEventListener("click", closeCopilot);
    const cpForm = document.getElementById("vs-cp-form");
    if (cpForm)
      cpForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const input = document.getElementById("vs-cp-input");
        const q = input.value.trim();
        if (!q) return;
        input.value = "";
        copilotAsk(q);
      });
    document.querySelectorAll(".cp-suggest").forEach((b) =>
      b.addEventListener("click", () => copilotAsk(b.dataset.q || b.textContent))
    );
  }

  /* ---- Auth gate: runs synchronously (before deferred module scripts),
     so signed-out visitors never fire doomed API calls ---- */
  const isProtected = document.body.hasAttribute("data-protected");
  const isAuthPage = document.body.hasAttribute("data-auth-page");

  if (isProtected && !session.isLoggedIn) {
    window.location.replace("/login");
  } else if (isAuthPage && session.isLoggedIn) {
    window.location.replace("/dashboard");
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (isProtected && !session.isLoggedIn) return; // redirecting
    if (isAuthPage && session.isLoggedIn) return; // redirecting

    if (isProtected) {
      fillUser();
      loadBadges();
    }

    initShell();

    /* logout notice from a forced session-expiry redirect */
    try {
      const m = sessionStorage.getItem("vs_logout_msg");
      if (m && isAuthPage) { sessionStorage.removeItem("vs_logout_msg"); setTimeout(() => toast(m, "warning"), 400); }
    } catch {}
  });

  /* ------------------------------------------------------------------ */
  /* Expose                                                              */
  /* ------------------------------------------------------------------ */
  window.VS = {
    api,
    session,
    logout,
    toast,
    modal,
    confirm: confirmDialog,
    pagination,
    openCopilot,
    copilotAsk,
    openCmdk,
    utils: { escapeHtml, initials, fmtDate, timeAgo, debounce, avatar, emptyRow, exportCSV, fmtMoney },
  };
})();

import pool from "../database/db.js";

const rows = async (text, params) => {
  const r = await pool.query(text, params);
  return r.rows;
};

/**
 * Gathers a full operational snapshot used by both the insights
 * panel and the AI chat copilot.
 */
const gatherContext = async () => {
  const [
    bookingTotals,
    userTotals,
    serviceTotals,
    shopTotals,
    categoryTotals,
    planTotals,
    notificationTotals,
    vehicleTypes,
    topServices,
    cities,
    trend,
    growth,
    recentBookings,
    recentUsers,
  ] = await Promise.all([
    rows(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE slot_date = CURRENT_DATE::text)::int AS today,
              COUNT(*) FILTER (WHERE slot_date >= CURRENT_DATE::text)::int AS upcoming
       FROM booking`
    ),
    rows(
      `SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE role = 'user')::int AS customers,
              COUNT(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS new_7d
       FROM users`
    ),
    rows(`SELECT COUNT(*)::int AS total FROM vehicle_service`),
    rows(`SELECT COUNT(*)::int AS total FROM shop`),
    rows(`SELECT COUNT(*)::int AS total FROM category`),
    rows(
      `SELECT COUNT(*)::int AS total,
              COALESCE(AVG(plan_price), 0)::float AS avg_price,
              COALESCE(MAX(plan_price), 0)::float AS max_price,
              COALESCE(MIN(plan_price), 0)::float AS min_price
       FROM plan`
    ),
    rows(`SELECT COUNT(*)::int AS total FROM notification`),
    rows(
      `SELECT vehicle_type, COUNT(*)::int AS count
       FROM booking GROUP BY vehicle_type ORDER BY count DESC LIMIT 6`
    ),
    rows(
      `SELECT service_name, COUNT(*)::int AS count
       FROM booking GROUP BY service_name ORDER BY count DESC LIMIT 3`
    ),
    rows(
      `SELECT city, COUNT(*)::int AS count
       FROM shop GROUP BY city ORDER BY count DESC LIMIT 5`
    ),
    rows(
      `SELECT to_char(d, 'Dy') AS day, COUNT(b.book_id)::int AS count
       FROM generate_series(CURRENT_DATE - interval '6 days', CURRENT_DATE, interval '1 day') d
       LEFT JOIN booking b ON b.created_at::date = d::date
       GROUP BY d ORDER BY d`
    ),
    rows(
      `SELECT
        COUNT(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS this_week,
        COUNT(*) FILTER (WHERE created_at <= now() - interval '7 days'
                         AND created_at > now() - interval '14 days')::int AS last_week
       FROM booking`
    ),
    rows(
      `SELECT b.book_id, b.vehicle_name, b.vehicle_type, b.slot_date, b.slot_time,
              b.service_name, u.name AS user_name
       FROM booking b LEFT JOIN users u ON b.uid = u.id
       ORDER BY b.book_id DESC LIMIT 5`
    ),
    rows(
      `SELECT id, name, phone, role, created_at
       FROM users ORDER BY created_at DESC LIMIT 5`
    ),
  ]);

  const b = bookingTotals[0] || {};
  const u = userTotals[0] || {};
  const p = planTotals[0] || {};
  const g = growth[0] || { this_week: 0, last_week: 0 };
  const growthPct =
    g.last_week > 0
      ? Math.round(((g.this_week - g.last_week) / g.last_week) * 1000) / 10
      : g.this_week > 0
      ? 100
      : 0;

  const peakDay = [...trend].sort((a, x) => x.count - a.count)[0];
  const topType = vehicleTypes[0];
  const topService = topServices[0];
  const topCity = cities[0];

  return {
    kpis: {
      bookings: b.total || 0,
      bookingsToday: b.today || 0,
      bookingsUpcoming: b.upcoming || 0,
      users: u.total || 0,
      customers: u.customers || 0,
      newUsers7d: u.new_7d || 0,
      services: (serviceTotals[0] || {}).total || 0,
      shops: (shopTotals[0] || {}).total || 0,
      categories: (categoryTotals[0] || {}).total || 0,
      plans: p.total || 0,
      planAvgPrice: p.avg_price || 0,
      planMaxPrice: p.max_price || 0,
      planMinPrice: p.min_price || 0,
      notifications: (notificationTotals[0] || {}).total || 0,
    },
    charts: { vehicleTypes, cities, trend },
    growth: { ...g, pct: growthPct },
    top: { type: topType, service: topService, city: topCity, day: peakDay },
    recent: { bookings: recentBookings, users: recentUsers },
  };
};

const buildInsights = (ctx) => {
  const out = [];
  const k = ctx.kpis;

  if (ctx.growth.pct > 0) {
    out.push({
      type: "positive",
      icon: "bi-graph-up-arrow",
      title: `Bookings up ${ctx.growth.pct}% this week`,
      detail: `${ctx.growth.this_week} new bookings in the last 7 days versus ${ctx.growth.last_week} the week before. Momentum is building — keep service slots open.`,
    });
  } else if (ctx.growth.pct < 0) {
    out.push({
      type: "warning",
      icon: "bi-graph-down-arrow",
      title: `Bookings down ${Math.abs(ctx.growth.pct)}% this week`,
      detail: `Only ${ctx.growth.this_week} bookings in the last 7 days versus ${ctx.growth.last_week} previously. Consider sending a promotional broadcast or discount plan.`,
    });
  } else {
    out.push({
      type: "neutral",
      icon: "bi-activity",
      title: "Booking volume is steady",
      detail: `${ctx.growth.this_week} bookings in the last 7 days — same pace as the previous week.`,
    });
  }

  if (k.bookingsToday > 0) {
    out.push({
      type: "info",
      icon: "bi-calendar-check",
      title: `${k.bookingsToday} appointment${k.bookingsToday > 1 ? "s" : ""} scheduled today`,
      detail: `${k.bookingsUpcoming} upcoming appointments in the pipeline. Check bay capacity and staffing.`,
    });
  }

  if (ctx.top.type) {
    const share = k.bookings
      ? Math.round((ctx.top.type.count / k.bookings) * 100)
      : 0;
    out.push({
      type: "info",
      icon: "bi-car-front",
      title: `${ctx.top.type.vehicle_type} dominates demand (${share}%)`,
      detail: `${ctx.top.type.count} of ${k.bookings} bookings are for ${ctx.top.type.vehicle_type} vehicles. Prioritize specialist technicians for this category.`,
    });
  }

  if (ctx.top.day && ctx.top.day.count > 0) {
    out.push({
      type: "neutral",
      icon: "bi-clock-history",
      title: `${String(ctx.top.day.day).trim()} is your busiest day`,
      detail: `Peak booking activity lands on ${String(ctx.top.day.day).trim()}. Staff extra mechanics and extend shop hours on this day.`,
    });
  }

  if (k.newUsers7d > 0) {
    out.push({
      type: "positive",
      icon: "bi-person-plus",
      title: `${k.newUsers7d} new customer${k.newUsers7d > 1 ? "s" : ""} joined this week`,
      detail: `Total customer base is now ${k.customers}. New signups are prime candidates for a first-service welcome offer.`,
    });
  }

  if (ctx.top.city) {
    out.push({
      type: "neutral",
      icon: "bi-geo-alt",
      title: `${ctx.top.city.city} leads coverage with ${ctx.top.city.count} centers`,
      detail: `${k.shops} partner centers across ${ctx.charts.cities.length} cit${ctx.charts.cities.length === 1 ? "y" : "ies"}. Consider expanding in underserved locations.`,
    });
  }

  if (k.plans > 0 && k.planAvgPrice > 0) {
    out.push({
      type: "info",
      icon: "bi-credit-card",
      title: `Average plan price is ₹${k.planAvgPrice.toFixed(0)}`,
      detail: `Plans range from ₹${k.planMinPrice} to ₹${k.planMaxPrice}. A mid-tier bundle around ₹${Math.round(k.planAvgPrice * 1.2)} could lift average revenue per customer.`,
    });
  }

  if (k.bookings === 0) {
    out.push({
      type: "warning",
      icon: "bi-database",
      title: "No bookings recorded yet",
      detail: "Seed a few service categories and book a first appointment to unlock AI analytics.",
    });
  }

  return out;
};

export const aiInsightsController = async (req, res) => {
  try {
    const ctx = await gatherContext();
    return res.status(200).json({
      status: true,
      engine: process.env.GEMINI_API_KEY ? "gemini" : "local",
      generatedAt: new Date().toISOString(),
      kpis: ctx.kpis,
      charts: ctx.charts,
      growth: ctx.growth,
      top: ctx.top,
      recent: ctx.recent,
      insights: buildInsights(ctx),
    });
  } catch (error) {
    console.error("AI insights error =>", error.message);
    return res.status(500).json({
      status: false,
      msg: "Failed to generate insights",
    });
  }
};

/* ---------------------------------------------------------
 * Local intent engine — answers using live database context
 * ------------------------------------------------------- */
const localAnswer = (lower, ctx) => {
  const k = ctx.kpis;

  if (/(help|what can you|capab|feature)/.test(lower)) {
    return (
      "**I'm your Vehicle Service copilot.** Ask me things like:\n" +
      "- *How many bookings do we have?*\n" +
      "- *What's trending this week?*\n" +
      "- *Show today's appointments*\n" +
      "- *How many customers joined recently?*\n" +
      "- *Which service is most popular?*\n" +
      "- *Tell me about our plans and pricing*\n" +
      "- *Where are our service centers?*\n" +
      "- *Any business suggestions?*"
    );
  }

  if (/(hello|hi\b|hey|good (morning|evening|afternoon))/.test(lower)) {
    return `Hello! 👋 I'm watching over **${k.bookings} bookings**, **${k.customers} customers** and **${k.shops} service centers**. Ask me anything about your operations.`;
  }

  if (/(today|upcoming|next).*(appointment|booking|slot)/.test(lower) || /today'?s appointment/.test(lower)) {
    const today = ctx.recent.bookings.filter(
      (b) => b.slot_date === new Date().toISOString().slice(0, 10)
    );
    if (k.bookingsToday > 0 || today.length > 0) {
      const lines = today.length
        ? today
            .slice(0, 5)
            .map((b) => `• **${b.vehicle_name}** — ${b.service_name} at ${b.slot_time}`)
        : ["• No vehicle details on today's slots."];
      return `**${k.bookingsToday} appointment(s) scheduled today.** 📅\n${lines.join("\n")}\n\n${k.bookingsUpcoming} total upcoming in the pipeline.`;
    }
    return "No appointments are scheduled for today. A good day for maintenance work or running a promotional broadcast. 🛠️";
  }

  if (/(booking|appointment)/.test(lower) && /(how many|count|total|number)/.test(lower)) {
    const t = ctx.top.type ? ` Most are **${ctx.top.type.vehicle_type}** vehicles.` : "";
    const g =
      ctx.growth.pct > 0
        ? ` Up ${ctx.growth.pct}% vs last week 📈`
        : ctx.growth.pct < 0
        ? ` Down ${Math.abs(ctx.growth.pct)}% vs last week 📉`
        : " Steady vs last week.";
    return `You have **${k.bookings} total bookings**.${t}${g}`;
  }

  if (/(user|customer|people|account|registr)/.test(lower)) {
    return `You have **${k.users} accounts** — ${k.customers} customers plus admins. **${k.newUsers7d} new signups** in the last 7 days. ${
      k.newUsers7d > 0 ? "Great acquisition pace! 🚀" : "Consider a referral broadcast to boost signups."
    }`;
  }

  if (/(popular|top|best|most).*(service|repair|work)/.test(lower) || /which service/.test(lower)) {
    if (ctx.top.service) {
      return `**${ctx.top.service.service_name}** is your most requested service with **${ctx.top.service.count} bookings**. Keep spare parts and specialist staff ready for it. 🔧`;
    }
    return "No service requests recorded yet, so I can't rank popularity. Book a few appointments first!";
  }

  if (/(vehicle|car|bike|type)/.test(lower) && /(top|most|popular|demand)/.test(lower)) {
    if (ctx.top.type) {
      const share = k.bookings ? Math.round((ctx.top.type.count / k.bookings) * 100) : 0;
      return `**${ctx.top.type.vehicle_type}** vehicles drive demand — ${ctx.top.type.count} bookings (${share}% of total). ${
        ctx.charts.vehicleTypes[1]
          ? `Second place: ${ctx.charts.vehicleTypes[1].vehicle_type} (${ctx.charts.vehicleTypes[1].count}).`
          : ""
      }`;
    }
    return "No vehicle-type data yet.";
  }

  if (/(plan|subscription|pricing|price|revenue)/.test(lower)) {
    if (k.plans > 0) {
      return `You offer **${k.plans} subscription plans** from ₹${k.planMinPrice} to ₹${k.planMaxPrice} (avg ₹${k.planAvgPrice.toFixed(0)}). 💡 A premium annual bundle around ₹${Math.round(k.planAvgPrice * 1.5)} could capture high-frequency customers.`;
    }
    return "No subscription plans configured yet. Create 2–3 tiers (Basic / Standard / Premium) in the Plans module to drive recurring revenue.";
  }

  if (/(shop|center|centre|garage|city|location|coverage)/.test(lower)) {
    if (k.shops > 0) {
      const cityLines = ctx.charts.cities
        .slice(0, 5)
        .map((c) => `• **${c.city}** — ${c.count} center${c.count > 1 ? "s" : ""}`);
      return `You have **${k.shops} partner centers**:\n${cityLines.join("\n")}`;
    }
    return "No service centers registered yet. Add your first center in Shops & Centers.";
  }

  if (/(notif|broadcast|alert|message)/.test(lower)) {
    return `**${k.notifications} broadcasts** sent so far. ${
      ctx.growth.pct < 0
        ? "💡 Booking velocity is down — a targeted promotional push to dormant customers could help."
        : "Keep customers engaged with service reminders and offers."
    }`;
  }

  if (/(trend|week|growth|performance|how.*doing|stats|summary|overview|report)/.test(lower)) {
    const dir =
      ctx.growth.pct > 0 ? "📈 growing" : ctx.growth.pct < 0 ? "📉 slowing" : "➡️ steady";
    return `**Weekly snapshot**\n• Bookings: ${k.bookings} total, ${ctx.growth.this_week} this week (${dir} ${Math.abs(ctx.growth.pct)}%)\n• Customers: ${k.customers} (+${k.newUsers7d} new)\n• Services: ${k.services} • Centers: ${k.shops}\n• Today: ${k.bookingsToday} appointment(s) scheduled\n\nAsk me for *business suggestions* if you want actionable ideas.`;
  }

  if (/(suggest|recommend|advice|idea|improve|grow)/.test(lower)) {
    const ideas = [];
    if (ctx.growth.pct <= 0) ideas.push("• Launch a **win-back broadcast** — booking velocity is flat or declining this week.");
    if (k.bookingsToday === 0) ideas.push("• Today has **zero appointments** — push a same-day discount to fill empty bays.");
    if (ctx.top.type) ideas.push(`• Bundle a **${ctx.top.type.vehicle_type} care package** — it's your highest-demand segment.`);
    if (k.newUsers7d === 0) ideas.push("• Run a **referral campaign** — no new signups in 7 days.");
    if (k.plans < 3) ideas.push("• Add more **subscription tiers** to convert one-time customers into recurring revenue.");
    if (!ideas.length) ideas.push("• Metrics look healthy — focus on **service quality and reviews** to sustain growth.");
    return `Here's what I'd do next 👇\n${ideas.join("\n")}`;
  }

  // Fallback
  return `I couldn't match that to a specific metric, but here's the current pulse: **${k.bookings} bookings**, **${k.customers} customers**, **${k.services} services**, **${k.shops} centers**, ${k.bookingsToday} appointment(s) today.\n\nTry asking *\"weekly summary\"*, *\"top service\"*, or *\"business suggestions\"*.`;
};

export const aiChatController = async (req, res) => {
  const message = (req.body.message || "").toString().trim();

  if (!message) {
    return res.status(400).json({ status: false, msg: "Message is required" });
  }

  try {
    const ctx = await gatherContext();
    let engine = "local";
    let reply = localAnswer(message.toLowerCase(), ctx);

    // Optional upgrade path: if a GEMINI_API_KEY is configured,
    // let Gemini reason over the live business context.
    if (process.env.GEMINI_API_KEY) {
      try {
        const systemPrompt =
          "You are the AI copilot of a vehicle repair service admin panel. " +
          "Answer concisely with markdown-ish formatting (bold with **, bullets with •). " +
          "Base answers ONLY on this live business context JSON:\n" +
          JSON.stringify(ctx);

        const r = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents: [{ role: "user", parts: [{ text: message }] }],
              generationConfig: { maxOutputTokens: 600, temperature: 0.4 },
            }),
          }
        );
        const data = await r.json();
        const geminiText =
          data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
        if (geminiText) {
          reply = geminiText;
          engine = "gemini";
        }
      } catch (e) {
        console.error("Gemini fallback =>", e.message);
        // keep local answer
      }
    }

    return res.status(200).json({ status: true, engine, reply });
  } catch (error) {
    console.error("AI chat error =>", error.message);
    return res
      .status(500)
      .json({ status: false, msg: "Copilot is unavailable right now" });
  }
};

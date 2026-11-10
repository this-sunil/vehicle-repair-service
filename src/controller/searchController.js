import pool from "../database/db.js";

/* =====================================================================
 * Global search — powers the ⌘K command palette data results
 * GET /api/search?q=...&limit=4
 * ====================================================================*/

const like = (q) => `%${String(q).replace(/[%_]/g, (c) => "\\" + c)}%`;

export const searchController = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (q.length < 2) {
      return res.status(200).json({ status: true, result: {} });
    }
    const per = Math.min(8, Number(req.query.limit) || 4);
    const p = like(q.toLowerCase());

    const [users, bookings, services, categories, shops, plans, notifications] = await Promise.all([
      pool.query(
        `SELECT id, name, phone, role FROM users
         WHERE LOWER(name) LIKE $1 OR CAST(phone AS TEXT) LIKE $1
         ORDER BY id DESC LIMIT $2`,
        [p, per]
      ),
      pool.query(
        `SELECT b.book_id, b.vehicle_name, b.registration_no, b.service_name, b.slot_date, u.name AS user_name
         FROM booking b LEFT JOIN users u ON b.uid = u.id
         WHERE LOWER(b.vehicle_name) LIKE $1 OR LOWER(b.registration_no) LIKE $1
            OR LOWER(b.service_name) LIKE $1 OR LOWER(COALESCE(u.name,'')) LIKE $1
         ORDER BY b.book_id DESC LIMIT $2`,
        [p, per]
      ),
      pool.query(
        `SELECT id, title FROM vehicle_service WHERE LOWER(title) LIKE $1 ORDER BY id DESC LIMIT $2`,
        [p, per]
      ),
      pool.query(
        `SELECT cid, title, vehicle_type FROM category WHERE LOWER(title) LIKE $1 OR LOWER(vehicle_type) LIKE $1 ORDER BY cid DESC LIMIT $2`,
        [p, per]
      ),
      pool.query(
        `SELECT sid, shopname AS shopName, city FROM shop WHERE LOWER(shopname) LIKE $1 OR LOWER(city) LIKE $1 ORDER BY sid DESC LIMIT $2`,
        [p, per]
      ),
      pool.query(
        `SELECT pid, plan_title, plan_price FROM plan WHERE LOWER(plan_title) LIKE $1 ORDER BY pid DESC LIMIT $2`,
        [p, per]
      ),
      pool.query(
        `SELECT id, title FROM notification WHERE LOWER(title) LIKE $1 ORDER BY id DESC LIMIT $2`,
        [p, per]
      ),
    ]);

    return res.status(200).json({
      status: true,
      result: {
        users: users.rows,
        bookings: bookings.rows,
        services: services.rows,
        categories: categories.rows,
        shops: shops.rows,
        plans: plans.rows,
        notifications: notifications.rows,
      },
    });
  } catch (error) {
    console.log(`Error in Search => ${error.message}`);
    return res.status(500).json({ status: false, msg: "Internal Server Error" });
  }
};

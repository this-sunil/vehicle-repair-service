import pool from "../database/db.js";

/* =====================================================================
 * Activity / Audit log — records every admin action in the panel
 * ====================================================================*/

const createActivityTable = () => {
  const query = `
  CREATE TABLE IF NOT EXISTS activity_log(
    id SERIAL PRIMARY KEY,
    admin_id INT,
    admin_name TEXT,
    action VARCHAR(32) NOT NULL,
    entity VARCHAR(32) NOT NULL,
    entity_id TEXT,
    details TEXT,
    ip VARCHAR(64),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`;
  pool.query(query, (err) => {
    if (err) console.log(`Activity Table => ${err.message}`);
    else console.log(`Activity Log Table Ready`);
  });
};
createActivityTable();

/* ------------------------------------------------------------------
 * logActivity — fire-and-forget audit writer. Never throws, never
 * blocks the response. Call it AFTER a successful mutation.
 *
 *   logActivity(req, {
 *     action: "create" | "update" | "delete" | "login" | "logout" | "security",
 *     entity: "user" | "booking" | "service" | "category" | "shop" | "plan" | "notification" | "setting",
 *     entityId: 42,
 *     details: "Short human-readable summary",
 *   });
 * -----------------------------------------------------------------*/
export const logActivity = (req, { action, entity, entityId = null, details = "", admin }) => {
  const actor = admin || (req && req.user) || {};
  const ip = (req && (req.headers["x-forwarded-for"] || req.ip || "") || "").toString().slice(0, 64);
  const query = `
    INSERT INTO activity_log(admin_id, admin_name, action, entity, entity_id, details, ip)
    VALUES($1,$2,$3,$4,$5,$6,$7)`;
  pool
    .query(query, [
      actor.id ?? null,
      actor.name || "system",
      String(action).slice(0, 32),
      String(entity).slice(0, 32),
      entityId != null ? String(entityId).slice(0, 64) : null,
      String(details || "").slice(0, 500),
      ip,
    ])
    .catch((e) => console.log(`logActivity => ${e.message}`));
};

/* ------------------------------------------------------------------
 * GET /api/activity — pagened audit trail with optional filters
 *   ?page=1&limit=20&action=create&entity=user
 * -----------------------------------------------------------------*/
export const getActivityController = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const action = (req.query.action || "").trim();
    const entity = (req.query.entity || "").trim();
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];
    if (action) { params.push(action); where.push(`action=$${params.length}`); }
    if (entity) { params.push(entity); where.push(`entity=$${params.length}`); }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countResult = await pool.query(`SELECT COUNT(*)::int AS total FROM activity_log ${whereSql}`, params);
    const totalItem = countResult.rows[0].total || 0;
    const totalPage = Math.max(1, Math.ceil(totalItem / limit));

    const listParams = [...params, limit, offset];
    const { rows } = await pool.query(
      `SELECT * FROM activity_log ${whereSql} ORDER BY id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      listParams
    );

    return res.status(200).json({
      status: true,
      msg: "Fetch Activity Successfully",
      currentPage: page,
      totalPage,
      totalItem,
      result: rows,
    });
  } catch (error) {
    console.log(`Error in Activity => ${error.message}`);
    return res.status(500).json({ status: false, msg: "Internal Server Error" });
  }
};

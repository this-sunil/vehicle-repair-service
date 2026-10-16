import pool from "../database/db.js";

const createBookTable = () => {
  const query = `
  CREATE TABLE IF NOT EXISTS booking(book_id SERIAL PRIMARY KEY,uid INT NOT NULL,vehicle_name VARCHAR(255) NOT NULL,registration_no VARCHAR(255) NOT NULL,vehicle_photo VARCHAR(255) NOT NULL,vehicle_type VARCHAR(255) NOT NULL,slot_date VARCHAR(255) NOT NULL,slot_time VARCHAR(255) NOT NULL,service_name VARCHAR(255) NOT NULL,FOREIGN KEY (uid) REFERENCES users(id),created_at TIMESTAMP Default CURRENT_TIMESTAMP)`;
  pool.query(query, (err) => {
    if (err) {
      throw err.message;
    }
    console.log(`Booking Table Created Successfully !!!`);
  });
};
createBookTable();


export const addBookingController = async (req, res) => {
  try {
    const {
      id,
      vehicle_name,
      registration_no,
      vehicle_type,
      slot_date,
      slot_time,
      service_name,
    } = req.body;

    // =========================
    // Validate required fields
    // =========================
    if (
      !id ||
      !vehicle_name ||
      !registration_no ||
      !vehicle_type ||
      !slot_date ||
      !slot_time ||
      !service_name
    ) {
      return res.status(400).json({
        status: false,
        msg: "Missing params",
      });
    }

    // =========================
    // Check user exists
    // =========================
    const userQuery = `
      SELECT id
      FROM users
      WHERE id = $1
    `;

    const userResult = await pool.query(userQuery, [id]);

    if (userResult.rows.length === 0) {
      return res.status(400).json({
        status: false,
        msg: "User not found",
      });
    }

    // =========================
    // Vehicle photo
    // =========================
    const photo = req.file ? req.file.path : "";

    console.log("Uploaded file:", req.file);
    console.log("Cloudinary URL:", photo);

    // =========================
    // Insert booking
    // =========================
    const bookingQuery = `
      INSERT INTO booking (
        uid,
        vehicle_name,
        registration_no,
        vehicle_photo,
        vehicle_type,
        slot_date,
        slot_time,
        service_name
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const bookingResult = await pool.query(bookingQuery, [
      id,
      vehicle_name,
      registration_no,
      photo,
      vehicle_type,
      slot_date,
      slot_time,
      service_name,
    ]);

    if (bookingResult.rows.length === 0) {
      return res.status(400).json({
        status: false,
        msg: "Insertion failure",
      });
    }

    // =========================
    // Success
    // =========================
    return res.status(200).json({
      status: true,
      msg: "Inserted successfully",
      result: bookingResult.rows[0],
    });
  } catch (error) {
    console.error("Error in Booking =>", error.message);

    return res.status(500).json({
      status: false,
      msg: "Internal Server Error",
      error: error.message,
    });
  }
};


export const getAllBookingController = async (req, res) => {
  const uid = req.body.uid;
  const page = Number(req.body.page) || 1;
  const limit = Number(req.body.limit) || 10;

  try {
    const isSpecificUser = uid && uid !== 'all' && uid !== 'admin';
    const countQuery = isSpecificUser
      ? `SELECT count(*) FROM booking WHERE uid=$1`
      : `SELECT count(*) FROM booking`;
    const countResult = isSpecificUser
      ? await pool.query(countQuery, [uid])
      : await pool.query(countQuery);

    const totalItem = Number(countResult.rows[0].count);
    const totalPage = Math.ceil(totalItem / limit) || 1;
    const offset = (page - 1) * limit;

    const prevPage = page > 1;
    const nextPage = page < totalPage;

    const query = isSpecificUser
      ? `SELECT b.*, u.name as user_name, u.phone as user_phone FROM booking b LEFT JOIN users u ON b.uid = u.id WHERE b.uid=$1 ORDER BY b.book_id DESC LIMIT $2 OFFSET $3`
      : `SELECT b.*, u.name as user_name, u.phone as user_phone FROM booking b LEFT JOIN users u ON b.uid = u.id ORDER BY b.book_id DESC LIMIT $1 OFFSET $2`;

    const { rows } = isSpecificUser
      ? await pool.query(query, [uid, limit, offset])
      : await pool.query(query, [limit, offset]);

    return res.status(200).json({
      status: true,
      msg: "Fetch Slot History Successfully !!!",
      currentPage: page,
      totalPage,
      totalItem,
      result: rows,
      prevPage,
      nextPage,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      msg: "Internal Server Error",
    });
  }
};

export const deleteBookingController = async (req, res) => {
  const book_id = req.body.book_id;
  try {
    const query = `DELETE FROM booking WHERE book_id=$1 RETURNING *`;
    const { rows } = await pool.query(query, [book_id]);
    if (rows.length === 0) {
      return res.status(400).json({
        status: false,
        msg: "Failed to delete",
      });
    }
    return res.status(200).json({
      status: true,
      msg: "Booking Delete Successfully !!!",
      result: rows,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      msg: "Internal Server Error",
    });
  }
};

export const updateBookingController = async (req, res) => {
  const {
    book_id,
    uid,
    vehicle_name,
    registration_no,
    vehicle_type,
    slot_date,
    slot_time,
    service_name,
  } = req.body;
  const targetId = book_id || req.body.id;
  try {
    if (!targetId && !uid) {
      return res.status(400).json({
        status: false,
        msg: "Missing booking identifier",
      });
    }
    const fields = [];
    const values = [];
    let currentIndex = 1;
    const data = {
      vehicle_name,
      registration_no,
      vehicle_type,
      slot_date,
      slot_time,
      service_name,
    };
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null && value !== "") {
        fields.push(`${key}=$${currentIndex}`);
        values.push(value);
        currentIndex++;
      }
    }
    const photo = req.file ? req.file.filename : "";
    if (photo) {
      fields.push(`vehicle_photo=$${currentIndex++}`);
      values.push(photo);
    }
    const idToUse = targetId || uid;
    const idCol = targetId ? "book_id" : "uid";
    values.push(idToUse);
    const query = `UPDATE booking SET ${fields.join(", ")} WHERE ${idCol}=$${currentIndex} RETURNING *`;
    const { rows } = await pool.query(query, values);
    if (rows.length === 0) {
      return res.status(400).json({
        status: false,
        msg: "Failed to update",
      });
    }
    return res.status(200).json({
      status: true,
      msg: "Update Booking Slot Successfully",
      result: rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      msg: "Internal Server Error",
    });
  }
};

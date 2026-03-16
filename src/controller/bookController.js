import pool from "../database/db.js";

const createBookTable = () => {
  const query = `CREATE TABLE IF NOT EXISTS booking(book_id SERIAL PRIMARY KEY,uid INT NOT NULL,vehicle_name VARCHAR(255) NOT NULL,registration_no VARCHAR(255) NOT NULL,vehicle_photo VARCHAR(255) NOT NULL,vehicle_type VARCHAR(255) NOT NULL,slot_date VARCHAR(255) NOT NULL,slot_time VARCHAR(255) NOT NULL,service_name VARCHAR(255) NOT NULL,FOREIGN KEY (uid) REFERENCES users(id),created_at TIMESTAMP Default CURRENT_TIMESTAMP)`;
  pool.query(query, (err) => {
    if (err) {
      throw err.message;
    }
    console.log(`Booking Table Created Successfully !!!`);
  });
};
createBookTable();

export const addBookingController = async (req, res) => {
  const {
    uid,
    vehicle_name,
    registration_no,
    vehicle_photo,
    vehicle_type,
    slot_date,
    slot_time,
    service_name,
  } = req.body;
  try {
    if (
      !uid ||
      !vehicle_name ||
      !registration_no ||
      !vehicle_photo ||
      !vehicle_type ||
      !slot_date ||
      !slot_time ||
      !service_name
    ) {
      return res.json(400).json({
        status: false,
        msg: "Missing params",
      });
    }
    const existUser = `SELECT * FROM users WHERE uid=$1`;
    const result = await pool.query(existUser, [uid]);
    if (result.rows.length === 0) {
      return res.status(400).json({
        status: false,
        msg: "Users not found !!!",
      });
    }

    const query = `INSERT INTO bookings(uid,vehicle_name,registration_no,vehicle_photo,vehicle_type,slot_date,slot_time,service_name) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`;
    const { rows } = await pool.query(query, [
      uid,
      vehicle_name,
      registration_no,
      vehicle_photo,
      vehicle_type,
      slot_date,
      slot_time,
      service_name,
    ]);
    if (rows.length === 0) {
      return res.status(400).json({
        status: false,
        msg: "Insertion Failure ",
      });
    }
    return res.status(200).json({
      status: true,
      msg: "Inserted Successfully !!!",
      result: rows[0],
    });
  } catch (e) {
    return res.status(500).json({
      status: false,
      msg: "Internal Server Error",
    });
  }
};

export const getAllBookingController = async (req, res) => {
  const uid = req.body.uid;
  const page = Number(req.body.page) || 10;

  try {
    if (!uid) {
      return res.status(400).json({
        status: false,
        msg: "Missing userid",
      });
    }

    const limit = 10;
    const countQuery = `SELECT count(*) FROM booking WHERE uid=$1`;
    const result = await pool.query(countQuery, [uid]);
    const totalItem = Number(result.rows[0].count);
    const totalPage = Math.ceil(totalItem / limit);
    const offset = (page - 1) * limit;

    const prevPage = page > 1;
    const nextPage = page < totalPage;

    const query = `SELECT * FROM booking WHERE uid=$1 ORDER BY book_id LIMIT $2 OFFSET $3`;
    const { rows } = await pool.query(query, [uid, limit, offset]);
    if (rows.length === 0) {
      return res.status(400).json({
        status: false,
        msg: "No Data Found !!!",
      });
    }
    return res.status(200).json({
      status: true,
      msg: "Fetch Slot History Successfully !!!",
      currentPage: page,
      totalPage,
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
    const query = `DELETE FROM booking WHERE book_id=$1`;
    const { rows } = await pool.query(query, [book_id]);
    if (rows.length === 0) {
      return res.status(400).json({
        status: true,
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
    uid,
    vehicle_name,
    registration_no,
    vehicle_type,
    slot_date,
    slot_time,
    service_name,
  } = req.body;
  try {
    if (!uid) {
      return res.status(400).json({
        status: false,
        msg: "Missing userid",
      });
    }
    const field = [];
    const values = [];
    let currentIndex = 1;
    const data = {
      uid,
      vehicle_name,
      registration_no,
      vehicle_type,
      slot_date,
      slot_time,
      service_name,
    };
    for (const [key, value] of Object.entries(data)) {
      field.push(`${key}=$${currentIndex}`);
      values.push(value);
      currentIndex++;
    }
    const photo = req.file ? req.file.filename : "";
    if (photo) {
      field.push(`photo=$${currentIndex++}`);
      values.push(photo);
    }
    values.push(uid);
    const query = `UPDATE SET ${field.join(", ")} booking WHERE uid=$${currentIndex}`;
    const { rows } = await pool.query(query, [
      uid,
      vehicle_name,
      registration_no,
      photo,
      vehicle_type,
      slot_date,
      slot_time,
      service_name,
    ]);
    if(rows.length===0){
        return res.status(400).json({
            status:false,
            msg:"Failed to update"
        });
    }
    return res.status(200).json({
        status:true,
        msg:"Update Booking Slot Successfully",
        result:rows[0]
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      msg: "Internal Server Error",
    });
  }
};

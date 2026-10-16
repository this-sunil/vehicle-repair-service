import pool from "../database/db.js";

const createNotificationTable = () => {
  const query = `CREATE TABLE IF NOT EXISTS notification(id SERIAL PRIMARY KEY,title VARCHAR(255) NOT NULL,description TEXT NOT NULL,photo VARCHAR(255) NOT NULL,uid INT NOT NULL,FOREIGN KEY (uid) REFERENCES users(id) ON DELETE CASCADE,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`;
  pool.query(query, (err) => {
    if (err) {
      throw err;
    }
    console.log("Notification Table Created Successfully");
  });
};

createNotificationTable();

export const addNotificationController = async (req, res) => {
  const { title, description, subtitle } = req.body;
  const content = description || subtitle || "";
  try {
    const photo = req.file ? req.file.filename : "";
    const query = `INSERT INTO notification(title,subtitle,photo) VALUES($1,$2,$3) RETURNING *`;
    const { rows } = await pool.query(query, [title, content, photo]);
    if (rows.length === 0) {
      return res.status(400).json({
        status: false,
        msg: "Notification Insertion Failure"
      });
    }
    return res.status(200).json({
      status: true,
      msg: "Notification Inserted Successfully !!!",
      result: rows
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      msg: "Internal Server Error"
    });
  }
};

export const updateNotificationController = async (req, res) => {
  const { id, title, description, subtitle } = req.body;
  const content = description || subtitle;
  try {
    const fields = [];
    const values = [];
    let currentIndex = 1;
    if (title !== undefined && title !== null && title !== "") {
      fields.push(`title=$${currentIndex++}`);
      values.push(title);
    }
    if (content !== undefined && content !== null && content !== "") {
      fields.push(`subtitle=$${currentIndex++}`);
      values.push(content);
    }
    const photo = req.file ? req.file.filename : "";
    if (photo) {
      fields.push(`photo=$${currentIndex++}`);
      values.push(photo);
    }
    values.push(id);
    const query = `UPDATE notification SET ${fields.join(", ")} WHERE id=$${currentIndex} RETURNING *`;
    const { rows } = await pool.query(query, values);
    if (rows.length === 0) {
      return res.status(400).json({
        status: false,
        msg: "Failed Notification Update",
      });
    }
    return res.status(200).json({
      status: true,
      msg: "Update Notification Successfully",
      result: rows,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      msg: "Internal Server Error"
    });
  }
};

export const deleteNotificationController = async (req, res) => {
  const id = req.body.id;
  try {
    const query = `DELETE FROM notification WHERE id=$1`;
    const { rows } = await pool.query(query, [id]);
    if (rows.length === 0) {
      return res.status(200).json({
        status: false,
        msg: "Delete Data Failure",
      });
    }
    return res.status(200).json({
      status: true,
      msg: "Notification Deleted Successfully !!!",
      result: rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      msg: "Internal Server Error",
    });
  }
};

export const fetchNotificationController = async (req, res) => {
  const page = Number(req.body.page) || 1;
  try {
    const countQuery = `SELECT count(*) FROM notification`;
    const result = await pool.query(countQuery);
   
    const limit = 10;
    const offset = (page - 1) * limit;
    const totalItem = Number(result.rows[0].count);
    console.log(`Total Items=>${totalItem}`);

    const totalPage = Math.ceil(totalItem / limit);
    const query = `SELECT * FROM notification ORDER BY id LIMIT $1 OFFSET $2`;
    const {rows} = await pool.query(query, [limit, offset]);
    if(rows.length===0){
      return res.status(400).json({
        status:false,
        msg:"No Data Found !!!"
      });
    }
    return res.status(200).json({
        status: true,
        msg: "Fetch Notification Successfully !!!",
        currentPage: page,
        totalPage,
        result: rows,
        prevPage: page > 1,
        nextPage: page < totalPage
      });
  } catch (error) {

    return res.status(500).json({
      status: false,
      msg: `Internal Server Error ${error.message}`
    });
  }
};

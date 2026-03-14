import pool from "../database/db.js";

const createCatTable = async () => {
  const query = `CREATE TABLE IF NOT EXISTS category(cid SERIAL PRIMARY KEY,title TEXT NOT NULL,photo TEXT NOT NULL,vehicle_type TEXT NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`;
  pool.query(query, (err) => {
    if (err) {
      throw err;
    }
    console.log(`Category Table Created`);
  });
};

createCatTable();

export const addCategoryController = async (req, res) => {
  const { title, type } = req.body;
  try {
    const photo = req.file ? req.file.filename : "";
    const query = `INSERT INTO category(title,photo,vehicle_type) VALUES($1,$2,$3) RETURNING *`;
    const { rows } = await pool.query(query, [title, photo, type]);
    if (rows.length === 0) {
      return res.status(404).json({
        status: false,
        msg: "Failed to insert category !!!",
      });
    }
    return res.status(200).json({
      status: true,
      msg: "Insert Category Successfully !!!",
      result: rows[0],
    });
  } catch (error) {
    console.log(`Error in add Category=>${error.msg}`);
    return res.status(500).json({
      status: false,
      msg: "Internal Server Error",
    });
  }
};

export const updateCategoryController = async (req, res) => {
  const { cid, title, type } = req.body;
  try {
    const fields = [];
    const values = [];
    const data = { cid, title, type };
    let index = 1;
    const photo = req.file ? req.file.filename : "";
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        fields.push(`${key}=$${index}`);
        values.push(value);
        index++;
      }
    }
    if (photo) {
      fields.push(`photo=$${index++}`);
      values.push(photo);
    }
    values.push(cid);
    const query = `UPDATE category SET ${fields.join(", ")} WHERE cid=$${index} RETURNING *`;
    const { rows } = await pool.query(query, values);
    if (rows.length === 0) {
      return res.status(404).json({
        status: false,
        msg: "Failed to Update Category !!!",
      });
    }
    return res.status(200).json({
      status: true,
      msg: "Update Category Successfully !!!",
      result: rows[0],
    });
  } catch (error) {
    console.log(`Error in =>${error.msg}`);
    return res.status(500).json({
      status: false,
      msg: "Internal Server Error",
    });
  }
};

export const deleteCategoryController = async (req, res) => {
  const cid = req.body.cid;
  try {
    const query = `DELETE FROM category WHERE cid=$1 RETURNING *`;
    const { rows } = await pool.query(query, [cid]);
    if (rows.length === 0) {
      return res.status(404).json({
        status: false,
        msg: "Failed to Delete Category",
      });
    }
    return res.status(200).json({
      status: true,
      msg: "Delete Category Successfully !!!",
    });
  } catch (error) {
    console.log(`Error in =>${error.msg}`);
    return res.status(500).json({
      status: false,
      msg: "Internal Server Error",
    });
  }
};

export const getAllCategoryController = async (req, res) => {
  const limit = Number(req.body.limit) || 10;
  const page = Number(req.body.page) || 1;
  try {
    const offset=(page-1)*limit;
    const query = `SELECT * FROM category ORDER BY cid LIMIT $1 OFFSET $2`;
    const { rows } = await pool.query(query, [limit, offset]);
    if (rows.length === 0) {
      return res.status(404).json({
        status: false,
        msg: "No Data Found !!!",
      });
    }
    const countQuery = `SELECT COUNT(*) FROM category`;
    const countResult = await pool.query(countQuery);
    const totalItem = Number(countResult.rows[0].count);
    const totalPage = Math.ceil(totalItem / limit);
    const prevPage=page>1;
    const nextPage=page<totalPage;
    return res.status(200).json({
      status: true,
      msg: "Fetch Category Successfully!!!",
      page,
      totalPage,
      prevPage,
      nextPage,
      result: rows,
    });
  } catch (error) {
    console.log(`Error in Category=>${error.msg}`);
    return res.status(500).json({
      status: false,
      msg: "Internal Server Error",
    });
  }
};

// export const getAllVehicleType=async (req,res) => {
//   const limit=Number(req.body.limit) || 10;
//   const page=Number(req.body.page) || 1;
//   try {
//     const offset=(page-1)*limit;
//     const query=`select cid,title from category order by cid LIMIT $1 OFFSET $2`;
//     const { rows }=await pool.query(query,[limit,offset]);

//     if(rows.length===0){
//       return res.status(404).json({
//         status:false,
//         msg:"No data found !!!"
//       });
//     }
//     const totalItem=Number(rows.length);
//     const totalPage=Math.ceil(totalItem/limit);
//     const prevPage=page>1;
//     const nextPage=page<totalPage;

//     return res.status(200).json({
//       status:true,
//       msg:"Fetch Vehicle category Successfully !!!",
//       totalPage,
//       prevPage,
//       nextPage,
//       result:rows
//     });
//   } catch (error) {
//     return res.status(500).json({
//       status:false,
//       msg:"Internal Server Error"
//     });
//   }
// };

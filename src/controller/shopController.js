import pool from "../database/db.js";

const createShopTable = () => {
  const query = `CREATE TABLE IF NOT EXISTS shop(
  sid SERIAL PRIMARY KEY,
  shopName VARCHAR(255) NOT NULL,
  shopPhoto VARCHAR(255) NOT NULL,
  shopTime VARCHAR(255) NOT NULL,
  phone BIGINT NOT NULL,
  lat FLOAT NOT NULL,
  long FLOAT NOT NULL,
  status BOOLEAN NOT NULL,
  city VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`;
  pool.query(query,(err)=>{
    if(err){
        throw err;
    }
    console.log("Create Shop Table Successfully !!!");
  });
};

createShopTable();

export const addShopController=async(req,res)=>{
    const {shopName,shopTime,phone,lat,long,status,city}=req.body;
    try {
        const shopPhoto=req.file?req.file.filename:"";
        const query=`INSERT INTO shop(shopName,shopPhoto,shopTime,phone,lat,long,status,city) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`;
        const {rows}=await pool.query(query,[shopName,shopPhoto,shopTime,phone,lat,long,status,city]);
        if(rows.length>0){
            return res.status(200).json({
                status:true,
                msg:"Shop Added Successfully"
            });
        }
    } catch (error) {
        return res.status(500).json({
            status:false,
            msg:"Internal Server Error"
        });
    }
};

export const updateShopController=async(req,res)=>{
    const {shopName,shopTime,phone,lat,long,status,city}=req.body;
    try {
        const fields=[];
        const values=[];
        let currentIndex=1;
        const data={shopName,shopTime,phone,lat,long,status,city};
        for(const [key,value] of Object.entries(data)){
            fields.push(`${key}=$${currentIndex}`);
            values.push(value);
            currentIndex++;
        }
        const shopPhoto=req.file?req.file.filename:"";
        if(shopPhoto){
            fields.push(`photo=$${currentIndex++}`);
            values.push(shopPhoto);
        }
        values.push(sid);
        const query=`UPDATE SET ${fields.join(", ")} shop WHERE sid=$${currentIndex}`;
        const {rows}=await pool.query(query,values);
        if(rows.length>0){
            return res.status(200).json({
                status:true,
                msg:"Shop Update Successfully",
                result:rows[0]
            });
        }
    } catch (error) {
        return res.status(500).json({
            status:false,
            msg:"Internal Server Error"
        });
    }
};

export const deleteShopController=async(req,res)=>{
    const sid=req.body.sid;
    try {
        const query=`DELETE FROM shop WHERE sid=$1`;
        const {rows}=await pool.query(query,[sid]);
        if(rows.length===0){
            return res.status(400).json({
                status:false,
                msg:"Delete Operation Failed"
            });
        }
        return res.status(200).json({
            status:true,
            msg:"Delete Successfully !!!",
            result:rows[0]
        });
    } catch (error) {
        return res.status(500).json({
            status:false,
            msg:"Internal Server Error"
        });
    }
};

export const fetchShopController = async (req, res) => {
  const page = Number(req.body.page) || 1;
  const limit = Number(req.body.limit) || 10;
  try {
    const countQuery = `SELECT count(*) FROM shop`;
    const result = await pool.query(countQuery);
    if (result.rows.length === 0) {
      return res.status(400).json({
        status: false,
        msg: "No Data Found !!!"
      });
    }
    const offset = (page - 1) * limit;
    const totalItem = result.rows[0].count;
    console.log(`Total Items=>${totalItem}`);

    const totalPage = Math.ceil(totalItem / limit);
    const query = `SELECT * FROM shop ORDER BY id LIMIT $1 OFFSET $2`;
    const rows = await pool.query(query, [limit, offset]);
    if (rows.length > 0) {
      return res.status(200).json({
        status: true,
        msg: "Fetch Shop Successfully !!!",
        currentPage: page,
        totalPage,
        result: rows,
        prevPage: page > 1,
        nextPage: page < totalPage
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: false,
      msg: "Internal Server Error"
    });
  }
};

export const searchByCityController = async (req, res) => {
  const page = Number(req.body.page) || 1;
  const limit = Number(req.body.limit) || 10;
  const city=req.body.city;
  
  
  try {
    if(!city){
        return res.status(400).json({
            status:false,
            msg:"Missing param city"
        });
    }
    const countQuery = `SELECT count(*) FROM shop WHERE city=$1`;
    const result = await pool.query(countQuery,[city]);
    if (result.rows.length === 0) {
      return res.status(400).json({
        status: false,
        msg: "No Data Found !!!"
      });
    }
    const offset = (page - 1) * limit;
    const totalItem = result.rows[0].count;
    console.log(`Total Items=>${totalItem}`);

    const totalPage = Math.ceil(totalItem / limit);
    const query = `SELECT * FROM shop WHERE city=$1 ORDER BY sid LIMIT $1 OFFSET $2`;
    const rows = await pool.query(query, [city,limit, offset]);
    if (rows.length > 0) {
      return res.status(200).json({
        status: true,
        msg: "Fetch Shop Successfully !!!",
        currentPage: page,
        totalPage,
        result: rows,
        prevPage: page > 1,
        nextPage: page < totalPage
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: false,
      msg: `Internal Server Error ${error.message}`
    });
  }
};
import pool from "../database/db.js";
import bcrypt from "bcrypt";
import { generateToken } from "../middleware/verifyToken.js";
import { isAccountLocked, recordLoginFailure, resetLoginFailures } from "../middleware/security.js";
import { logActivity } from "./activityController.js";

const createAdmin = async () => {
  try {
    const query = `INSERT INTO users(name,phone,pass,photo,role) VALUES($1,$2,$3,$4,$5) RETURNING *`;
    const hashPass = await bcrypt.hash(process.env.ADMIN_PASS, 10);
    await pool.query(query, ["Admin", "9798657558", hashPass, "", "admin"]);
  } catch (error) {
    console.log(`Insert Admin record =>${error}`);
  }
};

const createUserTable = async () => {
  try {
    const query = `
    
    CREATE TABLE IF NOT EXISTS users(
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone BIGINT NOT NULL,
    pass TEXT NOT NULL,
    photo TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`;
    pool.query(query, async (err) => {
      if (err) {
        throw err;
      }
      console.log(`User Table Created`);
      const checkAdmin = `SELECT * FROM users`;
      const { rows } = await pool.query(checkAdmin);
      if (rows.length === 0) {
        createAdmin();
      }
      console.log(`Admin Already Created`);
    });
  } catch (error) {
    console.log(`Error Creating Table =>${error}`);
  }
};

createUserTable();

export const loginController = async (req, res) => {
  const { phone, pass } = req.body;
  
  try {
    // ---- brute-force lockout check ----
    const lockedMin = isAccountLocked(phone);
    if (lockedMin > 0) {
      return res.status(423).json({
        status: false,
        msg: `Account temporarily locked. Try again in ${lockedMin} minute${lockedMin > 1 ? "s" : ""}.`,
      });
    }

    const query = `SELECT * FROM users WHERE phone=$1`;
    const { rows } = await pool.query(query, [phone]);
    if (rows.length === 0) {
      return res.status(400).json({
        status: false,
        msg: "User doesn't exists !!!",
      });
    }
    if (rows[0].role !== "admin") {
      return res.status(403).json({
        status: false,
        msg: "Only admin accounts can access this panel !!!",
      });
    }
    const isMatch = await bcrypt.compare(pass, rows[0].pass);

    if (!isMatch) {
      const remain = recordLoginFailure(phone); // returns minutes locked if tripped
      logActivity(req, { action: "security", entity: "auth", details: `Failed login (wrong password) for phone ${phone}` });
      return res.status(400).json({
        status: false,
        msg: remain > 0
          ? `Password doesn't Match. Account locked for ${remain} minute${remain > 1 ? "s" : ""}.`
          : "Password doesn't Match",
      });
    }
    resetLoginFailures(phone);
    logActivity(req, { action: "login", entity: "auth", entityId: rows[0].id, details: "Admin signed in" });
    delete rows[0].pass;
    const token = await generateToken(rows[0]);

    return res.status(200).json({
      status: true,
      msg: "Login Successfully !!!",
      token: token,
      result: rows[0]
    });

  } catch (error) {
    console.log(`Internal Server Error=>${error}`);
    return res.status(500).json({
      status: false,
      msg: `Internal Server Error ${error.msg}`,
    });
  }
};
export const registerController = async (req, res) => {
  const { name, phone, pass } = req.body;
  const role = "user";
  try {
    // Admin-only: user creation is restricted to authenticated admins
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        status: false,
        msg: "Only admins can create users !!!",
      });
    }
    const checkQuery = `SELECT * FROM users WHERE phone=$1`;
    const result = await pool.query(checkQuery, [phone]);
    if (result.rows.length > 0) {
      return res.status(400).json({
        status: false,
        msg: "User Already Exist !!!",
      });
    }
    const photo = req.file ? req.file.filename : "";
    const hashPass = await bcrypt.hash(pass, 10);
    const query = `INSERT INTO users(name,phone,pass,photo,role) VALUES($1,$2,$3,$4,$5) RETURNING *`;
    const { rows } = await pool.query(query, [
      name,
      phone,
      hashPass,
      photo,
      role,
    ]);
    if (rows.length === 0) {
      return res.status(400).json({
        status: false,
        msg: "Something Went Wrong",
      });
    }
    delete rows[0].pass;
    logActivity(req, { action: "create", entity: "user", entityId: rows[0].id, details: `Created user "${name}" (${phone})` });
    return res.status(200).json({
      status: true,
      msg: "User register Successfully !!!",
      result: rows[0],
    });
  } catch (error) {
    console.log(`Error in register controller=>${error}`);
    return res.status(500).json({
      status: false,
      msg: `Internal Server Error ${error}`,
    });
  }
};

export const fetchProfileController = async (req, res) => {
  const id = req.body.id;
  try {
    const query = `SELECT * FROM users WHERE id=$1`;
    const { rows } = await pool.query(query, [id]);
    if (rows.length === 0) {
      return res.status(400).json({
        status: false,
        msg: "User doesn't exist",
      });
    }
    delete rows[0].pass;
    const token = await generateToken(rows[0]);
    return res.status(200).json({
      status: true,
      msg: "Fetch User Successfully",
      token: token,
      result: rows[0],
    });
  } catch (error) {
    console.log(`Error =>${error.message}`);
    return res.status(500).json({
      status: false,
      msg: "Internal Server Error",
    });
  }
};

export const deleteUserController = async (req, res) => {
  const id = req.body.id;
  try {
    console.log(`User id=>${id}`);
    const checkQuery = `SELECT * FROM users WHERE id=$1`;
    const result = await pool.query(checkQuery);
    if (result.rows.length === 0) {
      return res.status(400).json({
        status: false,
        msg: "User doesn't exists",
      });
    }
    const query = `DELETE FROM users WHERE id=$1 RETURNING *`;
    const { rows } = await pool.query(query, [id]);
    logActivity(req, { action: "delete", entity: "user", entityId: id, details: `Deleted user "${(rows[0] || {}).name || id}"` });

    return res.status(200).json({
      status: true,
      msg: "Delete User Successfully !!!",
      result: rows[0],
    });
  } catch (error) {
    console.log(`Delete User Controller=>${error}`);
    return res.status(500).json({
      status: false,
      msg: "Internal Server Error",
    });
  }
};

export const updateProfileController = async (req, res) => {
  const { id, name, phone } = req.body;
  try {
    const checkQuery=`SELECT * FROM users WHERE id=$1`;
    const result=await pool.query(checkQuery,[id]);
    if(result.rows.length===0){
      return res.status(400).json({
        status:false,
        msg:"User doesn't exist"
      });
    }
    const data = { name, phone };
    const field = [];
    const values = [];
    let index = 1;
    console.log(`${name},${phone}`);
    const photo = req.file ? req.file.filename : "";
    for (const [key, value] of Object.entries(data)) {
      if (value !== 'undefined' && value !== null && value !== "") {
        field.push(`${key}=$${index}`);
        values.push(value);
        index++;
      }
    }
    if (photo) {
      field.push(`photo=$${index++}`);
      values.push(photo);
    }
    field.push(`id=$${index}`);
    values.push(id);

    const query = `UPDATE users SET ${field.join(
      ", "
    )} WHERE id=$${index} RETURNING *`;
    const { rows } = await pool.query(query, values);
    
    delete rows[0].pass;
    logActivity(req, { action: "update", entity: "user", entityId: id, details: `Updated profile of "${(rows[0] || {}).name || id}"` });
    const token = await generateToken(rows[0]);
    return res.status(200).json({
      status: true,
      token: token,
      msg: "Update Profile Successfully !!!",
      result: rows[0]
    });
  } catch (error) {
    console.log(`Error in update =>${error.message}`);
    return res.status(500).json({
      status: false,
      msg: "Internal Server Error"
    });
  }
};

export const forgotPassController=async(req,res)=>{
  const {phone,old_pass,current_pass}=req.body;
  try {
    const existUser=`SELECT * FROM users WHERE phone=$1`;
    const result=await pool.query(existUser,[phone]);
    if(result.rows.length===0){
      return res.status(400).json({
        status:false,
        msg:"User doesn't exist"
      });
    }
    const isMatch=await bcrypt.compare(old_pass,result.rows[0].pass);
    if(!isMatch){
      return res.status(400).json({
        status:false,
        msg:"Wrong Password !!!"
      });
    }
    const hashPass=await bcrypt.hash(current_pass,10);
    const query=`UPDATE users SET pass=$2 WHERE phone=$1 RETURNING *`;
    const {rows}=await pool.query(query,[phone,hashPass]);
    if(rows.length===0){
      return res.status(400).json({
        status:false,
        msg:"Failed to change password"
      });
    }
    delete rows[0].pass;
    logActivity(req, { action: "security", entity: "user", entityId: rows[0].id, details: `Password changed for "${(rows[0] || {}).name || phone}"` });
    return res.status(200).json({
      status:true,
      msg:"Change Pass Successfully!!!",
      result:rows[0]
    });
  } catch (error) {
    console.log(`Error in Change Pass=>${error}`);
    return res.status(500).json({
      status:false,
      msg:"Internal Server Error"
    });
  }
};

export const changePassController=async(req,res)=>{
  const {phone,current_pass}=req.body;
  try {
    const checkQuery=`SELECT * FROM users WHERE phone=$1`;
    const result=await pool.query(checkQuery,[phone]);
    if(result.rows.length===0){
      return res.status(400).json({
        status:false,
        msg:"User doesn't exist"
      });
    }
    const hashPass=await bcrypt.hash(current_pass,10);
    const query=`UPDATE users SET pass=$2 WHERE phone=$1 RETURNING *`;
    const {rows}=await pool.query(query,[phone,hashPass]);
    if(rows.length>0){
      return res.status(200).json({
        status:true,
        msg:"Forgot Password Successfully !!!"
      });
    }
  } catch (error) {
    return res.status(500).json({
      status:false,
      msg:"Internal Server Error"
    });
  }
};

export const getAllUserController=async(req,res)=>{
  try {
    let id=1;
    const query=`SELECT * FROM users WHERE id!=$${id}`;
    const {rows}=await pool.query(query,[id]);
    if(rows.length===0){
      return res.status(400).json({
        status:false,
        msg:"No Data Found !!!"
      });
    }
    return res.status(200).json({
      status:true,
      msg:"Fetch Users Successfully",
      result:rows
    });
  } catch (error) {
    console.log(`Error in All User=>${error.msg}`);
    return res.status(500).json({
      status:false,
      msg:"Internal Server Error"
    });
  }
};
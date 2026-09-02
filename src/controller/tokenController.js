import pool from "../database/db.js";
import { generateToken } from "../middleware/verifyToken.js";

export const tokenController=async (req,res) => {
    const id=req.body.id;
    try {
        const query=`SELECT * FROM users WHERE id=$1`;
        const { rows }=await pool.query(query,[id]);
        if(rows.length===0){
            return res.status({
                status:false,
                msg:"User doesn't exist !!!"
            });
        }
        const token=await generateToken(rows[0]);
        return res.status(200).json({
            status:true,
            msg:"Refresh Token Successfully !!!",
            token:token
        });
    } catch (error) {
        return res.status(500).json({
            status:false,
            msg:"Internal Server Error"
        });
    }
};
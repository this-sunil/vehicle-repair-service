import pool from "../database/db.js";
import { generateToken } from "../middleware/verifyToken.js";

export const tokenController=async (req,res) => {
    const id=req.body.id;
    try {
        const query=`SELECT * FROM users WHERE id=$1`;
        const { rows }=await pool.query(query,[id]);
        if(rows.length===0){
            return res.status(400).json({
                status:false,
                msg:"User doesn't exist !!!"
            });
        }
        // Admin-only project: tokens are only minted for admin accounts
        if(rows[0].role!=="admin"){
            return res.status(403).json({
                status:false,
                msg:"Only admin accounts can request tokens !!!"
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

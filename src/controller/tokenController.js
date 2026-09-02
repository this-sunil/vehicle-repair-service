import pool from "../database/db.js";
import { generateToken, verifyToken } from "../middleware/verifyToken.js";

export const tokenController=async (req,res) => {
    const id=req.body.id;
    try {
        if (!id) {
            return res.status(400).json({
                status: false,
                msg: "token are required"
            });
        }

        const isMatch = await verifyToken(refreshToken);

        if (!isMatch) {
            return res.status(401).json({
                status: false,
                msg: "Invalid or expired refresh token"
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
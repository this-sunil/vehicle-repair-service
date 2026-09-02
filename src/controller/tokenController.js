import pool from "../database/db.js";
import { generateToken, verifyToken } from "../middleware/verifyToken.js";

export const tokenController = async (req, res) => {
    try {
        const token = await generateToken(req.user);

        return res.status(200).json({
            status: true,
            msg: "Token Refreshed Successfully",
            token
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            status: false,
            msg: "Internal Server Error"
        });
    }
};

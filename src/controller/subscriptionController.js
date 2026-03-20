import pool from "../database/db.js";
const createSubscriptionTable=(req,res)=>{
    const query=`CREATE TABLE IF NOT EXISTS plan(pid SERIAL PRIMARY KEY,plan_title VARCHAR(255) NOT NULL,plan_type VARCHAR(255) NOT NULL,plan_price FLOAT NOT NULL,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`;
    pool.query(query,(err)=>{
        if(err){
            throw err;
        }
        console.log(`Subscription Plan Created !!!`);
    });
};
createSubscriptionTable();

export const addPlanController=async(req,res)=>{
    const {plan_title,plan_type,plan_price}=req.body;
    try {
        const query=`INSERT INTO plan(plan_title,plan_type,plan_price) values($1,$2,$3) RETURNING *`;
        const {rows}=await pool.query(query,[plan_title,plan_type,plan_price]);
        if(rows.length>0){
            return res.status(200).json({
                status:true,
                msg:"Plan Added Successfully !!!",
                result:rows[0]
            });
        }
        else{
            return res.status(400).json({
                status:false,
                msg:"Insert Operation Failed"
            });
        }
    } catch (error) {
        return res.status(500).json({
            status:false,
            msg:"Internal Server Error"
        });
    }
}

export const updatePlanController=async(req,res)=>{
    const {pid,plan_title,plan_type,plan_price}=req.body;
    try {
        const fields=[];
        const values=[];
        let currentIndex=1;
        const data={pid,plan_title,plan_type,plan_price};
        for(const [key,value] of Object.entries(data)){
            fields.push(`${key}=$${currentIndex}`);
            values.push(value);
            currentIndex++;
        }
        values.push(pid);
        const query=`UPDATE SET ${fields.join(", ")} plan WHERE pid=$${currentIndex} RETURNING *`;
        const {rows}=await pool.query(query,values);
        if(rows.length>0){
            return res.status(200).json({
                status:true,
                msg:"Plan Update Successfully !!!",
                result:rows[0]
            });
        }
        else{
            return res.status(400).json({
                status:false,
                msg:"Update Operation Failed"
            });
        }
    } catch (error) {
        return res.status(500).json({
            status:false,
            msg:"Internal Server Error"
        });
    }
}

export const deletePlanController=async(req,res)=>{
    const pid=req.body.pid;
    try {
        const query=`DELETE FROM plan WHERE pid=$1`;
        const {rows}=await pool.query(query,[pid]);
        if(rows.length===0){
            return res.status(400).json({
                status:false,
                msg:"DELETE Operation failed"
            });
        }
        return res.status(200).json({
            status:true,
            msg:"Delete Plan Successfully !!!",
            result:rows[0]
        });
    } catch (error) {
        return res.status(500).json({
            status:false,
            msg:"Internal Server Error"
        });
    }
}

export const fetchPlanController=async(req,res)=>{
    try {
        const query=`SELECT * FROM plan`;
        const {rows}=await pool.query(query,[pid]);
        if(rows.length===0){
            return res.status(400).json({
                status:false,
                msg:"No Plan Added"
            });
        }
        return res.status(200).json({
            status:true,
            msg:"Fetch Plan Successfully !!!",
            result:rows
        });
    } catch (error) {
        return res.status(500).json({
            status:false,
            msg:"Internal Server Error"
        });
    }
}
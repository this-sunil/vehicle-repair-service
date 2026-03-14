import pool from "../database/db.js";

const settingTable=async()=>{
    const query=`CREATE TABLE IF NOT EXISTS settings(sid SERIAL PRIMARY KEY,contact_url TEXT NOT NULL,terms_condition_url TEXT NOT NULL,privacy_policy_url TEXT NOT NULL,photo TEXT NOT NULL,created_at TIMESTAMP default CURRENT_TIMESTAMP)`;
    pool.query(query,(err)=>{
        if(err){
            throw err;
        }
        console.log(`Setting Table Created Successfully !!!`);
    });
}

settingTable();

export const addSettingController=async(req,res)=>{
    const {contact_url,privacy_policy_url,terms_condition_url}=req.body;
    try {
        const photo=req.file?req.file.filepath:"";
        const query=`INSERT INTO settings(contact_url,privacy_policy_url,terms_condition_url,photo) VALUES($1,$2,$3,$4) RETURNING *`;
        const {rows}=await pool.query(query,[contact_url,privacy_policy_url,terms_condition_url,photo]);
        if(rows.length===0){
            return res.status(404).json({
                status:false,
                msg:"Something Went Wrong !!!"
            });
        }
        return res.status(200).json({
            status:true,
            msg:"Setting Table Inserted Successfully !!!",
            result:rows[0]
        });
    } catch (error) {
        console.log(`Insert setting table=>${error.message}`);
        return res.status(500).json({
            status:500,
            msg:"Internal Server Error !!!"
        });
    }
};

export const deleteSettingController=async(req,res)=>{
    const id=req.body.id;
    try {
     const query=`DELETE FROM settings WHERE id=$1 RETURNING *`;
     const {rows}=await pool.query(query,[id]);
     if(rows.length===0){
        return res.status(404).json({
            status:false,
            msg:"No Data Found !!!"
        });
     }
     return res.status(200).json({
        status:true,
        msg:"Delete Setting Successfully!!!",
        result:rows[0]
     });
    } catch (error) {
        console.log(`Delete Setting Controller=>${error.message}`);
        return res.status(500).json({
            status:false,
            msg:"Internal Server error"
        });
    }
};

export const updateSettingController=async(req,res)=>{
    const {sid,contact_url,privacy_policy_url,terms_condition_url}=req.body;
    try {
        const photo=req.file?req.file.filepath:"";
        const fields=[];
        const values=[];
        let index=1;
        const data={contact_url,privacy_policy_url,terms_condition_url}
        for(const [key,value] of Object.entries(data)){
            fields.push(`${key}=$${index}`);
            values.push(value);
            index++;
        }
        if(photo){
            fields.push(`photo=$${index++}`);
            values.push(photo);
        }
        values.push(sid);
        const query=`UPDATE settings SET ${fields.join(", ")} WHERE sid=$${index} RETURNING *`;
        const {rows}=await pool.query(query,values);
        if(rows.length===0){
            return res.status(404).json({
                status:false,
                msg:"Something Went Wrong !!!"
            });
        }
        return res.status(200).json({
            status:true,
            msg:"Update Setting Successfully !!!",
            result:rows[0]
        });
    } catch (error) {
        console.log(`Error in setting update=>${error.message}`);
        return res.status(500).json({
            status:false,
            msg:"Internal Server Error"
        });
    }
};

export const getSettingController=async(req,res)=>{
    const uid=req.body.uid;
    try {
        const checkQuery=`SELECT 1 FROM users WHERE id=$1`;
        const {existUser}=await pool.query(checkQuery,[uid]);
        if(!existUser){
            return res.status(404).json({status:false,msg:"User doesn't exist"});
        }
        const query=`SELECT * FROM settings`;
        const {rows}=await pool.query(query);
        return res.status(200).json({
            status:true,
            msg:"Fetch Setting Successfully !!!",
            result:rows[0]
        });
    } catch (error) {
        console.log(`Fetch Setting Controller=>${error.message}`);
        return res.status(500).json({
            status:false,
            msg:"Internal Server Error !!!"
        });
    }
};

export const fetchSettingController=async(req,res)=>{
    try {
        const uid=req.body.id;
        const checkQuery=`SELECT * FROM users WHERE id=$1`;
        console.log(uid);
        
        const result=await pool.query(checkQuery,[uid]);
        if(result.rows.length===0){
            return res.status(200).json({
                status:false,
                msg:"User doesn't exist"
            });
        }
        const query=`SELECT * FROM settings`;
        const {rows}=await pool.query(query);
        if(rows.length===0){
            return res.status(404).json({
                status:false,
                msg:"Data Not Found !!!"
            });
        }
        return res.status(200).json({
            status:true,
            msg:"Fetch Setting Successfully !!!",
            result:rows[0]
        });
    } catch (error) {
        return res.status(500).json({
            status:false,
            msg:"Internal Server Error"
        });
    }
};

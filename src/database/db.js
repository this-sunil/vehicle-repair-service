import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();
const pool=new Pool({
    host:`${process.env.DB_HOSTNAME}`,
    user: `${process.env.DB_USER}`,
    database:`${process.env.DB_NAME}`,
    port:process.env.DB_PORT,
    password:""
});
console.log("DB_HOSTNAME:", process.env.DB_HOSTNAME);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_NAME:", process.env.DB_NAME);
console.log("DB_PASSWORD:", process.env.DB_PASSWORD);


const connectDB=async()=>{
     pool.connect((err)=>{
        if(err){
          throw err;
        }
        console.log(`Database Created Successfully !!!`);
    });
};
connectDB();
export default pool;
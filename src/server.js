import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import {Server} from "socket.io";
import authRoute from "./routes/authRoute.js";
import categoryRoute from "./routes/categoryRoute.js";
import vehicleRoute from "./routes/serviceRoute.js";
import settingRoute from "./routes/settingRoute.js";
import bookingRoute from "./routes/bookRoute.js";
//import notificationRoute from "./routes/notificationRoute.js";
//import serviceCenterRoute from "./routes/shopRoute.js";
//import subscriptionRoute from "./routes/subscriptionRoute.js";
import upload from "./middleware/upload.js";
import rateLimit from "express-rate-limit";
dotenv.config({debug:true,encoding:true,override:true});

const app=express();
app.use(express.urlencoded({extended:true}));
app.use(express.json());
console.log("PORT =", process.env.PORT);
app.use(cors({
    origin: "*",
    optionsSuccessStatus: 200,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"]
}));

const limiter=rateLimit({
 windowMs:15*60*1000,
 limit:100,
 standardHeaders: 'draft-8',
 legacyHeaders:false,
 ipv6Subnet: 56,
 message:"Too many request,Please try again later."
});

app.use(limiter);
app.use("/upload",express.static(path.join(process.cwd(),'src/upload')));
app.use("/public",express.static(path.join(process.cwd(),"src/public")));
app.use("/bootstrap-icons",express.static(path.join(process.cwd(),'node_modules/bootstrap-icons')))
app.set("view engine","ejs");
app.set('views',path.join(process.cwd(),'src/views'));

app.get('/dashboard' , (req , res)=>{
  return res.render("dashboard");
});
app.get("/privacy",(req,res)=>{
  return res.render("privacy");
});
app.get("/terms-condition",(req,res)=>{
  return res.render("terms");
});

const PORT=process.env.PORT || 4000;

app.use("/api",authRoute);
app.use("/api",categoryRoute);
app.use("/api",vehicleRoute);
app.use("/api",settingRoute);
app.use("/api",bookingRoute);
//app.use("/api",notificationRoute);
//app.use("/api",serviceCenterRoute);
//app.use("/api",subscriptionRoute);











const server=app.listen(PORT,()=>{
    console.log(`Server Started at http://localhost:${PORT}`);
});

const io=new Server(server);
const client=new Set();

io.on('connection',(socket)=>{
    console.log(`Socket Connected Server !!!`);
    client.add(socket);
    socket.emit('message',"Hello,How can I Help You?");
    
    socket.on('disconnect',()=>{
        client.delete(socket);
        console.log(`Disconnected Client Server !!!`);
    });
});

app.post("/api/send-message", upload.none(), (req, res) => {
  const message = req.body.message;
  if (!message) return res.status(400).json({ error: "Message is required" });

  for (const socket of client) {
    socket.emit("message", message);
  }

  return res.json({ status: true, msg: message, sentTo: client.size });
});





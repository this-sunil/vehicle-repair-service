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
import notificationRoute from "./routes/notificationRoute.js";
import shopRoute from "./routes/shopRoute.js";
import subscriptionRoute from "./routes/subscriptionRoute.js";
import upload from "./middleware/upload.js";
import rateLimit from "express-rate-limit";

dotenv.config({debug:true,encoding:'utf-8',override:true});

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

console.log("PORT =", process.env.PORT);

app.use(
  cors({
    origin: process.env.BASE_URL || "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200
  })
);

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  ipv6Subnet: 56,
  handler: (req, res) => {
    return res.status(429).json({
      status: false,
      msg: "Too many requests, please try again later"
    });
  }
});

app.use("/api", limiter);

app.use("/upload", express.static(path.join(process.cwd(), "src/upload")));
app.use("/public", express.static(path.join(process.cwd(), "src/public")));
app.use("/bootstrap-icons", express.static(path.join(process.cwd(), "node_modules/bootstrap-icons")));
app.use(express.static(path.join(process.cwd(), "src/public/dist/")));
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "src/views"));

app.use("/api", authRoute);
app.use("/api", categoryRoute);
app.use("/api", vehicleRoute);
app.use("/api", settingRoute);
app.use("/api", bookingRoute);
app.use("/api",shopRoute);
app.use("/api",notificationRoute);
app.use("/api",subscriptionRoute);

app.get("/", (req, res) => {
  return res.render("dashboard");
});

app.get("/privacy", (req, res) => {
  return res.render("privacy");
});

app.get("/terms-condition", (req, res) => {
  return res.render("terms");
});

app.get("/login", (req, res) => {
  res.render("pages/samples/login"); // .ejs extension mat do
});

app.get("/register", (req, res) => {
  res.render("pages/samples/register");
});

app.get("/charts",(req,res)=>res.render("pages/charts/chartjs"));
app.get("/users",(req,res)=>res.render("pages/users"));

app.get("/basic-table",(req,res)=>res.render("pages/tables/basic-table"));

app.get("/basic-elements",(req,res)=>res.render("pages/forms/basic_elements"));

const PORT = process.env.PORT || 4000;

const server = app.listen(PORT, () => {
  console.log(`Server Started at http://localhost:${PORT}`);
});

const io = new Server(server, {
  cors: {
    origin: `${process.env.BASE_URL}`,
    methods: ["GET", "POST","PUT","PATCH","DELETE"],
    credentials:true,
    allowedHeaders:true
  }
});

const clients = new Set();

io.on("connection", (socket) => {
  console.log("Socket Connected:", socket.id);

  clients.add(socket);

  socket.emit("message", "Hello, How can I help you?");

  socket.on("disconnect", () => {
    clients.delete(socket);
    console.log("Socket Disconnected:", socket.id);
  });
});

app.post("/api/send-message", upload.none(), (req, res) => {
  const message = req.body.message;

  if (!message) {
    return res.status(400).json({
      status: false,
      msg: "Message is required"
    });
  }

  for (const socket of clients) {
    socket.emit("message", message);
  }

  return res.json({
    status: true,
    msg: message,
    sentTo: clients.size
  });
});





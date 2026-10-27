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
import tokenRoute from './routes/tokenRoute.js'
import subscriptionRoute from "./routes/subscriptionRoute.js";
import upload from "./middleware/upload.js";
import rateLimit from "express-rate-limit";
import { initializeApp, cert } from "firebase-admin/app";
import serviceAccount from "./firebase.json" with { type: "json" };
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
  windowMs: 20 * 60 * 1000,
  limit: 50,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  ipv6Subnet: 56,
  handler: (req, res) => {
    res.status(429).json({
      status: false,
      error: "RATE_LIMIT_EXCEEDED",
      msg: "Too many requests, please try again later"
    });
  }
});

// app.use("/api", limiter);

app.use("/upload", express.static(path.join(process.cwd(), "src/upload")));
app.use("/public", express.static(path.join(process.cwd(), "src/public")));
app.use("/bootstrap-icons", express.static(path.join(process.cwd(), "node_modules/bootstrap-icons")));
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
app.use("/auth",tokenRoute);

// ==========================================
// EJS Admin Panel View Routes
// ==========================================
// Dashboard
app.get(["/", "/dashboard"], (req, res) => {
  return res.render("admin/dashboard", { pageTitle: "Executive Dashboard", activeMenu: "dashboard" });
});

// Authentication
app.get("/login", (req, res) => {
  return res.render("auth/login", { pageTitle: "Sign In" });
});

app.get("/register", (req, res) => {
  return res.render("auth/register", { pageTitle: "Register Account" });
});

// Users Module
app.get("/users", (req, res) => {
  return res.render("users/index", { pageTitle: "Users Management", activeMenu: "users" });
});
app.get("/users/create", (req, res) => {
  return res.render("users/create", { pageTitle: "Register User", activeMenu: "users" });
});
app.get("/users/:id", (req, res) => {
  return res.render("users/show", { pageTitle: "User Details", activeMenu: "users", userId: req.params.id });
});
app.get("/users/:id/edit", (req, res) => {
  return res.render("users/edit", { pageTitle: "Edit User", activeMenu: "users", userId: req.params.id });
});

// Categories Module
app.get("/categories", (req, res) => {
  return res.render("categories/index", { pageTitle: "Vehicle Categories", activeMenu: "categories" });
});
app.get("/categories/create", (req, res) => {
  return res.render("categories/create", { pageTitle: "Add Category", activeMenu: "categories" });
});
app.get("/categories/:id", (req, res) => {
  return res.render("categories/show", { pageTitle: "Category Details", activeMenu: "categories", categoryId: req.params.id });
});
app.get("/categories/:id/edit", (req, res) => {
  return res.render("categories/edit", { pageTitle: "Edit Category", activeMenu: "categories", categoryId: req.params.id });
});

// Services Module
app.get("/services", (req, res) => {
  return res.render("services/index", { pageTitle: "Vehicle Services", activeMenu: "services" });
});
app.get("/services/create", (req, res) => {
  return res.render("services/create", { pageTitle: "Add Service", activeMenu: "services" });
});
app.get("/services/:id", (req, res) => {
  return res.render("services/show", { pageTitle: "Service Details", activeMenu: "services", serviceId: req.params.id });
});
app.get("/services/:id/edit", (req, res) => {
  return res.render("services/edit", { pageTitle: "Edit Service", activeMenu: "services", serviceId: req.params.id });
});

// Bookings Module
app.get("/bookings", (req, res) => {
  return res.render("bookings/index", { pageTitle: "Service Bookings", activeMenu: "bookings" });
});
app.get("/bookings/create", (req, res) => {
  return res.render("bookings/create", { pageTitle: "Book Appointment", activeMenu: "bookings" });
});
app.get("/bookings/:id", (req, res) => {
  return res.render("bookings/show", { pageTitle: "Appointment Details", activeMenu: "bookings", bookingId: req.params.id });
});
app.get("/bookings/:id/edit", (req, res) => {
  return res.render("bookings/edit", { pageTitle: "Reschedule Appointment", activeMenu: "bookings", bookingId: req.params.id });
});

// Shops & Centers Module
app.get("/shops", (req, res) => {
  return res.render("shops/index", { pageTitle: "Service Centers & Shops", activeMenu: "shops" });
});
app.get("/shops/create", (req, res) => {
  return res.render("shops/create", { pageTitle: "Add Service Center", activeMenu: "shops" });
});
app.get("/shops/:id", (req, res) => {
  return res.render("shops/show", { pageTitle: "Service Center Details", activeMenu: "shops", shopId: req.params.id });
});
app.get("/shops/:id/edit", (req, res) => {
  return res.render("shops/edit", { pageTitle: "Edit Service Center", activeMenu: "shops", shopId: req.params.id });
});

// Notifications Module
app.get("/notifications", (req, res) => {
  return res.render("notifications/index", { pageTitle: "Notifications", activeMenu: "notifications" });
});
app.get("/notifications/create", (req, res) => {
  return res.render("notifications/create", { pageTitle: "Send Notification", activeMenu: "notifications" });
});
app.get("/notifications/:id", (req, res) => {
  return res.render("notifications/show", { pageTitle: "Notification Details", activeMenu: "notifications", notificationId: req.params.id });
});
app.get("/notifications/:id/edit", (req, res) => {
  return res.render("notifications/edit", { pageTitle: "Edit Notification", activeMenu: "notifications", notificationId: req.params.id });
});

// Subscription Plans Module
app.get("/plans", (req, res) => {
  return res.render("plans/index", { pageTitle: "Subscription Plans", activeMenu: "plans" });
});
app.get("/plans/create", (req, res) => {
  return res.render("plans/create", { pageTitle: "Add Plan", activeMenu: "plans" });
});
app.get("/plans/:id", (req, res) => {
  return res.render("plans/show", { pageTitle: "Plan Details", activeMenu: "plans", planId: req.params.id });
});
app.get("/plans/:id/edit", (req, res) => {
  return res.render("plans/edit", { pageTitle: "Edit Plan", activeMenu: "plans", planId: req.params.id });
});

// Admin Profile & System Settings
app.get("/admin/profile", (req, res) => {
  return res.render("admin/profile", { pageTitle: "Admin Profile", activeMenu: "profile" });
});
app.get("/admin/settings", (req, res) => {
  return res.render("admin/settings", { pageTitle: "Application Settings", activeMenu: "settings" });
});

// Static / Informational Pages
app.get("/privacy", (req, res) => {
  return res.render("privacy");
});

app.get("/terms-condition", (req, res) => {
  return res.render("terms");
});

// Legacy / Demo Routes

// Errors
app.get("/403", (req, res) => res.status(403).render("errors/403", { pageTitle: "Access Denied" }));
app.get("/500", (req, res) => res.status(500).render("errors/500", { pageTitle: "Server Error" }));

// 404 Catch-All
app.use((req, res) => {
  res.status(404).render("errors/404", { pageTitle: "Page Not Found" });
});

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
const credential = cert(serviceAccount);

initializeApp({
  credential
});
const token = await credential.getAccessToken();

console.log(token.access_token);

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





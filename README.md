
# 🚗 Vehicle Repair Service – Full Stack Application

![Flutter](https://img.shields.io/badge/Flutter-Mobile%20App-blue?logo=flutter)
![Node.js](https://img.shields.io/badge/Node.js-Backend-green?logo=node.js)
![Express](https://img.shields.io/badge/Express.js-API-black?logo=express)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-orange)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## 📌 Project Overview

**Vehicle Repair Service** is a full-stack service booking platform built with:

- 📱 Flutter (Frontend Mobile App)
- ⚙️ Node.js + Express (REST API Backend)
- 🗄️ PostgreSQL (Database)


All authentication, booking logic, and data management are handled via a custom Node.js backend.

---

# 🚀 Core Features

## 🔐 Authentication System (Custom Backend)

- User registration & login
- JWT-based authentication
- Secure password hashing using bcrypt
- Role-based access (User / Mechanic / Admin)
- Middleware-protected routes

### Auth APIs

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/profile`

---

## 🚘 Service Booking System

Users can:

- Select vehicle type
- Choose service category
- Pick preferred date
- Select available time slot
- Confirm booking

### Booking Status Flow

- 🟡 Pending
- 🔵 Confirmed
- 🛠 In Progress
- 🟢 Completed
- 🔴 Cancelled

### Booking APIs

- `POST /api/bookings`
- `GET /api/bookings`
- `PUT /api/bookings/:id/status`
- `DELETE /api/bookings/:id`

---

## 🛠️ Service Management

Admin can:

- Add new services
- Update service pricing
- Manage service categories
- Control availability

### Service APIs

- `POST /api/services`
- `GET /api/services`
- `PUT /api/services/:id`
- `DELETE /api/services/:id`

---

## 🗄️ Database Design (PostgreSQL)

Tables:

- Users
- Vehicles
- Services
- Bookings
- Roles

Designed with:

- Foreign key relationships
- Indexed queries for performance
- Transaction-safe booking logic
- Slot validation to prevent double booking

---

# 📱 Flutter App Integration

- REST API integration using HTTP/Dio
- Secure JWT token storage
- Real-time booking updates
- Internet connectivity handling
- Clean and responsive UI
- Role-based dashboard rendering

---

# 🏗️ System Architecture

```
Flutter Mobile App
        ↓ REST API
Node.js + Express Server
        ↓
PostgreSQL Database
```

- Secure token-based communication
- Modular backend architecture
- Scalable service-layer design
- No third-party backend dependency

---

# 🛠️ Tech Stack

## 🎨 Frontend
- Flutter
- Dart
- Dio / HTTP
- Connectivity Plus

## ⚙️ Backend
- Node.js
- Express.js
- PostgreSQL
- JWT
- bcrypt
- Sequelize / Prisma (ORM)

---

# 🎯 Key Achievements

- Fully custom backend (No Firebase)
- Secure JWT authentication system
- Real-time booking workflow
- Slot validation to prevent conflicts
- Clean REST API structure
- Production-ready scalable architecture

---

# 🔮 Future Enhancements

- Payment gateway integration
- Push notification system
- Admin analytics dashboard
- Docker deployment
- CI/CD pipeline setup

---

## 📄 License

This project is licensed under the MIT License.
>>>>>>> e928d5f (save)


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

This version is fully API-driven and does **not use Firebase**.
All authentication, booking logic, and data management are handled via a custom Node.js backend.

---

# 🚀 Core Features

## 🔐 Authentication System (Custom Backend)

- **Admin-only login** — no public registration
- JWT-based authentication (30-minute expiry, token refresh)
- Secure password hashing using bcrypt
- Only accounts with the `admin` role can sign in
- `POST /api/register` (user creation) requires a logged-in admin token

### Default Admin Credentials

| Phone       | Password      |
| ----------- | ------------- |
| 9798657558  | `admin@1234`  |

> ⚠️ Change the default password immediately after your first login via the
> **Profile** page (uses your old password to set a new one). The password is
> seeded from `ADMIN_PASS` in `.env` when the users table is first created.

### Auth APIs

- `POST /api/auth/login` (admin only)
- `POST /api/auth/register` (admin token required)
- `POST /api/auth/forgotPass` (change own password)

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
- **Tailwind CSS admin panel** — responsive, dark-mode, with AI copilot & insights

---

## 🎨 Admin Panel (Tailwind CSS + AI)

The admin panel uses precompiled Tailwind CSS (no CDN dependency) with a custom
indigo brand palette, Inter font, dark mode (class strategy), collapsible
sidebar, command palette (⌘K), toasts, and an AI copilot.

### Build the CSS

Whenever you change classes in `src/views/**` or `src/public/js/**` or edit
`src/tailwind/admin.css`, regenerate the stylesheet:

```bash
npm run build:css
```

This compiles `src/tailwind/admin.css` → `src/public/css/admin.css` (minified).
Requires no dev dependencies — it runs the Tailwind CLI via `npx`.

### AI Features

- **Smart Insights** (`GET /api/ai/insights`) — auto-generated analytics cards on
  the dashboard. Works out of the box with no external API key (local analytics
  over your live database).
- **AI Copilot** (`POST /api/ai/chat`) — floating chat assistant that answers
  questions about bookings, customers, services, plans and centers.

**Optional Gemini upgrade:** add `GEMINI_API_KEY` to `.env` and restart the
server to have the copilot powered by Google Gemini 2.0 Flash instead of the
built-in intent engine. The badge in the copilot header shows the active engine.

---

# 🔮 Future Enhancements

- Payment gateway integration
- Push notification system
- Admin analytics dashboard
- Docker deployment
- CI/CD pipeline setup

---

## 📄 Preview
[![Watch the demo](https://img.youtube.com/vi/fXcrOBtX2Ac/maxresdefault.jpg)](https://youtu.be/fXcrOBtX2Ac)

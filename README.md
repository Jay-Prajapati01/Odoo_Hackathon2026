<div align="center">

# ⚡ AssetFlow

### Enterprise Asset & Resource Management ERP

A full-stack **MERN** application for managing the complete lifecycle of organizational assets — from procurement and allocation to maintenance, auditing, and retirement.

![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript_5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express_4-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite_6-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

<br>

[Getting Started](#-getting-started) •
[Features](#-features) •
[Architecture](#-architecture) •
[API Reference](#-api-reference) •
[Project Structure](#-project-structure)

</div>

---

## 📋 Table of Contents

- [About](#-about)
- [Key Features](#-key-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Demo Credentials](#-demo-credentials)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [RBAC System](#-rbac-system)
- [Frontend Pages](#-frontend-pages)
- [Backend Modules](#-backend-modules)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 About

**AssetFlow** is an enterprise-grade ERP system built for organizations to track, manage, and optimize their physical and digital assets. It provides end-to-end asset lifecycle management with role-based access control, workflow automation, audit trails, and real-time analytics dashboards.

Built as a **hackathon project** demonstrating full-stack MERN development with production-quality patterns: modular monolith backend, clean API design, comprehensive RBAC, and a polished React frontend.

---

## ✨ Key Features

### Asset Management
- 📦 Full asset CRUD with 30+ fields per asset (tag, serial number, specifications, warranty, condition tracking)
- 🏷️ Unique asset tags (AF-000001 format), QR codes, and barcodes
- 📎 Document attachments (invoices, warranties, manuals, certificates)
- 📊 Asset valuation tracking (purchase cost → current value)
- 🔍 Advanced search and multi-criteria filtering

### Allocation & Transfers
- 🔄 Complete allocation lifecycle (pending → allocated → returned)
- 📤 Asset transfers between employees/departments with approval workflow
- 📥 Return management with condition assessment and damage reporting
- 📈 Allocation history and audit trail

### Booking System
- 📅 Resource booking with date/time scheduling
- 🔄 Workflow states: Draft → Upcoming → Ongoing → Completed/Cancelled
- ⚡ Priority-based booking (low / medium / high / critical)
- 📋 Calendar view for visual scheduling

### Maintenance
- 🔧 Maintenance ticket lifecycle (7 workflow states)
- 👨‍🔧 Technician assignment and repair tracking
- ✅ Approval/rejection workflow (Manager approval required)
- 📝 Issue descriptions, priority levels, and resolution notes

### Audit Management
- 📋 Audit cycle creation with scoped asset audits
- ✅ Per-item verification (verified / missing / damaged / not found)
- 📊 Discrepancy tracking and resolution
- 📈 Audit statistics and reporting

### Dashboard & Analytics
- 📊 Real-time KPIs (total assets, allocations, maintenance tickets, booking stats)
- 📈 Interactive charts (Recharts) for asset distribution, utilization, and trends
- 🏢 Department-wise asset breakdown
- 🕐 Recent activity feed

### Notifications
- 🔔 Multi-channel notifications (in-app, email, push)
- 🏷️ Priority levels (low / medium / high / critical)
- 📦 Module-linked notifications (asset, allocation, maintenance, audit, booking)
- ✅ Mark read / mark all read / archive

### Settings & Configuration
- ⚙️ System-wide configurable settings
- 🔔 Notification preferences
- 🔧 Maintenance alert configuration
- 📋 Audit automation settings

---

## 🛠 Tech Stack

<table>
<tr><td><b>Layer</b></td><td><b>Technology</b></td><td><b>Purpose</b></td></tr>
<tr><td><b>Frontend</b></td><td>React 19 + TypeScript</td><td>UI Framework</td></tr>
<tr><td></td><td>Vite 6</td><td>Build Tool & Dev Server</td></tr>
<tr><td></td><td>React Router DOM v7</td><td>Client-side Routing</td></tr>
<tr><td></td><td>TanStack React Query v5</td><td>Server State Management</td></tr>
<tr><td></td><td>React Hook Form + Zod v4</td><td>Form Handling & Validation</td></tr>
<tr><td></td><td>Tailwind CSS v4</td><td>Styling</td></tr>
<tr><td></td><td>Motion (Framer Motion)</td><td>Animations</td></tr>
<tr><td></td><td>Recharts</td><td>Data Visualization</td></tr>
<tr><td></td><td>Lucide React</td><td>Icons</td></tr>
<tr><td></td><td>Axios</td><td>HTTP Client</td></tr>
<tr><td></td><td>date-fns</td><td>Date Utilities</td></tr>
<tr><td><b>Backend</b></td><td>Node.js + Express 4</td><td>API Server</td></tr>
<tr><td></td><td>TypeScript 5.5</td><td>Type Safety</td></tr>
<tr><td></td><td>Mongoose 8</td><td>ODM / Database Layer</td></tr>
<tr><td></td><td>MongoDB</td><td>Database</td></tr>
<tr><td></td><td>JWT (Access + Refresh)</td><td>Authentication</td></tr>
<tr><td></td><td>Joi + Zod</td><td>Request Validation</td></tr>
<tr><td></td><td>Helmet + CORS</td><td>Security</td></tr>
<tr><td></td><td>Winston + Morgan</td><td>Logging</td></tr>
<tr><td></td><td>Swagger (OpenAPI 3.0)</td><td>API Documentation</td></tr>
<tr><td></td><td>bcryptjs</td><td>Password Hashing</td></tr>
<tr><td></td><td>express-rate-limit</td><td>Rate Limiting</td></tr>
<tr><td><b>Testing</b></td><td>Jest + ts-jest</td><td>Test Runner</td></tr>
<tr><td></td><td>Supertest</td><td>HTTP Integration Tests</td></tr>
<tr><td></td><td>mongodb-memory-server</td><td>In-memory Test DB</td></tr>
<tr><td><b>DevOps</b></td><td>ESLint + Prettier</td><td>Code Quality</td></tr>
<tr><td></td><td>Husky + lint-staged</td><td>Git Hooks</td></tr>
</table>

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **MongoDB** ≥ 6.x (or use in-memory mode)
- **npm** or **yarn**

### Installation

```bash
# Clone the repository
git clone https://github.com/Jay-Prajapati01/Odoo_Hackathon2026.git
cd Odoo_Hackathon2026
```

### Backend Setup

```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your settings (or use USE_MEMORY_DB=true for in-memory)

# Start the backend server
npm run dev
```

Backend runs at `http://localhost:5000`
API docs at `http://localhost:5000/api-docs`

### Frontend Setup

```bash
cd frontend
npm install

# Start the development server
npm run dev
```

Frontend runs at `http://localhost:5173`

### Quick Start (In-Memory Mode)

For zero-setup, the backend supports an in-memory MongoDB:

```bash
cd backend
npm install
# Set USE_MEMORY_DB=true in .env
npm run dev
```

No external MongoDB instance required — data is seeded automatically on startup.

---

## 🔐 Demo Credentials

| Role | Email | Password | Access Level |
|------|-------|----------|-------------|
| 👑 **Admin** | `admin@assetflow.com` | `Admin@1234` | Full system access |
| 📊 **Asset Manager** | `manager@assetflow.com` | `Admin@1234` | Assets, allocations, maintenance |
| 🏢 **Department Head** | `head@assetflow.com` | `Admin@1234` | Department assets, approvals |
| 👤 **Employee** | `employee@assetflow.com` | `Admin@1234` | View assets, create bookings |

> Use the **role switcher** in the sidebar to quickly switch between roles in the demo.

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ React 19 │  │  Vite 6  │  │ Tailwind │  │ TanStack Query   │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└─────────────────────────────┬───────────────────────────────────┘
                              │ Axios (HTTP)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (/api/v1)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  Helmet  │  │   CORS   │  │  Rate    │  │   Request        │ │
│  │ Security │  │ Headers  │  │ Limiter  │  │   Sanitizer      │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                    MIDDLEWARE LAYER                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │JWT Auth  │  │RBAC Guard│  │Validator │  │ Error Handler    │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                    SERVICE LAYER (16 Modules)                     │
│  ┌────────┐ ┌──────────┐ ┌───────────┐ ┌──────────────────────┐ │
│  │  Auth  │ │  Asset   │ │Allocation │ │   Maintenance        │ │
│  ├────────┤ ├──────────┤ ├───────────┤ ├──────────────────────┤ │
│  │ RBAC   │ │ Booking  │ │ Transfer  │ │   Audit              │ │
│  ├────────┤ ├──────────┤ ├───────────┤ ├──────────────────────┤ │
│  │Dashboard│ │ Reports  │ │Notifi-    │ │   Organization       │ │
│  │        │ │          │ │cations    │ │                      │ │
│  └────────┘ └──────────┘ └───────────┘ └──────────────────────┘ │
└─────────────────────────────┬───────────────────────────────────┘
                              │ Mongoose ODM
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MongoDB / In-Memory DB                         │
└─────────────────────────────────────────────────────────────────┘
```

### Backend Architecture

- **Modular Monolith** — 16 self-contained modules with clear boundaries
- **Repository → Service → Controller** pattern per module
- **Shared Infrastructure** — event bus, realtime transport, pagination, error handling
- **Middleware Pipeline** — security, auth, RBAC, validation, logging

### Frontend Architecture

- **Component-based** React with TypeScript strict mode
- **Server State** managed via TanStack React Query (caching, refetching, mutations)
- **Global State** via React Context (auth, app settings)
- **Route Protection** via HOC with RBAC permission checks
- **Form Validation** via React Hook Form + Zod schemas

---

## 📁 Project Structure

```
OdooxHackathon/
│
├── 📂 backend/                          # Express.js API Server
│   ├── 📂 src/
│   │   ├── 📂 common/                   # Shared utilities
│   │   │   ├── api-response.ts          # Standardized JSON responses
│   │   │   ├── async-handler.ts         # Async error wrapper
│   │   │   ├── errors.ts                # Custom error classes
│   │   │   └── http-status.ts           # HTTP status constants
│   │   ├── 📂 config/                   # Environment & validation
│   │   ├── 📂 database/                 # MongoDB connection
│   │   ├── 📂 middleware/               # Auth, RBAC, rate-limit, logger
│   │   ├── 📂 modules/                  # 16 Business modules
│   │   │   ├── 📂 auth/                 # JWT auth, user management
│   │   │   ├── 📂 rbac/                 # Roles & permissions
│   │   │   ├── 📂 asset/                # Asset lifecycle
│   │   │   ├── 📂 allocation/           # Asset allocation
│   │   │   ├── 📂 transfer/             # Asset transfers
│   │   │   ├── 📂 return/               # Asset returns
│   │   │   ├── 📂 booking/              # Resource booking
│   │   │   ├── 📂 maintenance/          # Maintenance tickets
│   │   │   ├── 📂 audit/                # Audit cycles
│   │   │   ├── 📂 organization/         # Depts, employees, categories
│   │   │   ├── 📂 notification/         # Notifications & preferences
│   │   │   ├── 📂 dashboard/            # Dashboard & analytics
│   │   │   ├── 📂 reports/              # Report generation
│   │   │   ├── 📂 settings/             # System settings
│   │   │   ├── 📂 activity-log/         # Activity logging
│   │   │   └── 📂 audit-trail/          # Audit trail
│   │   ├── 📂 routes/                   # Route registration
│   │   ├── 📂 seed/                     # Database seeding
│   │   ├── 📂 shared/                   # Events, realtime, scope
│   │   ├── 📂 swagger/                  # OpenAPI docs
│   │   ├── 📂 types/                    # TypeScript declarations
│   │   └── 📂 utils/                    # JWT, password, logger, pagination
│   ├── 📂 tests/                        # 13 test files (unit + integration)
│   └── 📂 docs/                         # Architecture, API, deployment docs
│
├── 📂 frontend/                         # React + Vite Application
│   ├── 📂 src/
│   │   ├── 📂 components/               # Shared UI components
│   │   │   ├── Layout.tsx               # Full ERP layout (sidebar, header)
│   │   │   └── ProtectedRoute.tsx       # Auth + RBAC route guard
│   │   ├── 📂 contexts/                 # React Context providers
│   │   │   ├── AuthContext.tsx           # Auth state, JWT, role switching
│   │   │   └── AppContext.tsx            # Global search, theme, badges
│   │   ├── 📂 pages/                    # 14 page components
│   │   │   ├── Dashboard.tsx            # KPIs, charts, analytics
│   │   │   ├── Assets.tsx               # Asset management
│   │   │   ├── Allocation.tsx           # Allocations + Transfers
│   │   │   ├── Booking.tsx              # Resource booking
│   │   │   ├── Maintenance.tsx          # Maintenance tickets
│   │   │   ├── Audit.tsx                # Audit cycles
│   │   │   ├── Organization.tsx         # Depts, employees, categories
│   │   │   ├── Reports.tsx              # Reports & analytics
│   │   │   ├── Notifications.tsx        # Notification center
│   │   │   ├── Settings.tsx             # System settings
│   │   │   └── Login.tsx                # Auth page
│   │   ├── 📂 services/                 # API layer
│   │   │   ├── api.ts                   # API client with in-memory mock
│   │   │   └── mockData.ts              # Seed data for all entities
│   │   └── 📂 types/                    # TypeScript interfaces
│   │       └── index.ts                 # 15+ typed interfaces
│   ├── vite.config.ts                   # Vite + Tailwind + Proxy
│   └── package.json
│
└── README.md
```

---

## 📡 API Reference

**Base URL:** `http://localhost:5000/api/v1`

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/signup` | Register new user |
| `POST` | `/auth/login` | Login (returns JWT) |
| `POST` | `/auth/refresh` | Refresh access token |
| `POST` | `/auth/logout` | Logout (invalidate refresh) |
| `POST` | `/auth/forgot-password` | Request password reset |
| `POST` | `/auth/reset-password` | Reset password with token |
| `POST` | `/auth/change-password` | Change password (auth required) |
| `GET` | `/auth/me` | Get current user profile |

### Assets
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/assets` | List assets (paginated, filterable) |
| `GET` | `/assets/:id` | Get asset details |
| `POST` | `/assets` | Create new asset |
| `PUT` | `/assets/:id` | Update asset |
| `DELETE` | `/assets/:id` | Delete asset |
| `PATCH` | `/assets/:id/status` | Update asset status |
| `GET` | `/assets/:id/history` | Get asset history |

### Allocations
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/allocations` | List allocations |
| `POST` | `/allocations` | Create allocation |
| `PATCH` | `/allocations/:id/cancel` | Cancel allocation |
| `PATCH` | `/allocations/:id/return` | Return allocated asset |

### Transfers
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/transfers` | List transfers |
| `POST` | `/transfers` | Request transfer |
| `PATCH` | `/transfers/:id/approve` | Approve transfer |
| `PATCH` | `/transfers/:id/reject` | Reject transfer |
| `PATCH` | `/transfers/:id/complete` | Complete transfer |

### Bookings
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/bookings` | List bookings |
| `POST` | `/bookings` | Create booking |
| `PATCH` | `/bookings/:id/start` | Start booking |
| `PATCH` | `/bookings/:id/complete` | Complete booking |
| `PATCH` | `/bookings/:id/cancel` | Cancel booking |

### Maintenance
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/maintenance` | List tickets |
| `POST` | `/maintenance` | Create ticket |
| `PATCH` | `/maintenance/:id/approve` | Approve ticket |
| `PATCH` | `/maintenance/:id/reject` | Reject ticket |
| `PATCH` | `/maintenance/:id/assign` | Assign technician |
| `PATCH` | `/maintenance/:id/start` | Start repair |
| `PATCH` | `/maintenance/:id/complete` | Complete repair |

### Audits
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/audits` | List audit cycles |
| `POST` | `/audits` | Create audit cycle |
| `GET` | `/audits/:id` | Get audit details |
| `PATCH` | `/audits/:id/verify` | Verify audit item |
| `PATCH` | `/audits/:id/close` | Close audit cycle |

### Other Endpoints
| Group | Base Route | Description |
|-------|-----------|-------------|
| Dashboard | `/dashboard` | Summary, charts, analytics |
| Reports | `/reports` | Asset, allocation, maintenance reports |
| Notifications | `/notifications` | CRUD, mark read, archive |
| Settings | `/settings` | System configuration |
| Organization | `/departments`, `/employees`, `/asset-categories` | Org management |
| Roles | `/roles` | Role management |

> **100+ total API endpoints** with full CRUD, workflow actions, pagination, and filtering.

---

## 🔒 RBAC System

**4-tier enterprise role system with 48 granular permissions:**

| Permission | Admin | Asset Manager | Dept Head | Employee |
|-----------|:-----:|:------------:|:---------:|:--------:|
| Assets (read/write/delete) | ✅ | ✅ | ✅ | ✅ |
| Allocations (read/write) | ✅ | ✅ | ✅ | — |
| Transfers (read/write) | ✅ | ✅ | — | — |
| Bookings (read/write) | ✅ | ✅ | ✅ | ✅ |
| Maintenance (read/write) | ✅ | ✅ | — | — |
| Audits (read/write) | ✅ | ✅ | — | — |
| Departments (read/write) | ✅ | — | — | — |
| Employees (read/write) | ✅ | — | ✅ | — |
| Notifications (read/write) | ✅ | ✅ | ✅ | ✅ |
| Settings (read/write) | ✅ | — | — | — |
| Roles (read/write) | ✅ | — | — | — |
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Reports | ✅ | ✅ | — | — |

---

## 🖥 Frontend Pages

| Page | Route | Description |
|------|-------|-------------|
| 🔐 Login | `/` | Authentication with demo role quick-switch |
| 📊 Dashboard | `/dashboard` | KPIs, charts, recent activity |
| 📦 Assets | `/assets` | Asset table with search, filter, CRUD |
| 🔄 Allocation | `/allocation` | Allocations + Transfers tabs |
| 📅 Booking | `/booking` | Booking management with workflow |
| 🔧 Maintenance | `/maintenance` | Ticket lifecycle with 5 actions |
| 📋 Audit | `/audit` | Audit cycles with item verification |
| 🏢 Organization | `/organization` | Departments, employees, categories |
| 📈 Reports | `/reports` | Analytics and report generation |
| 🔔 Notifications | `/notifications` | Notification center |
| ⚙️ Settings | `/settings` | System configuration |

---

## 🧩 Backend Modules

| Module | Models | Key Features |
|--------|--------|-------------|
| **Auth** | User, RefreshToken | JWT access/refresh, password reset, profile |
| **RBAC** | Role, Permission | 48 permissions, 4 default roles |
| **Asset** | Asset, AssetHistory, AssetSequence | CRUD, status, history, documents |
| **Allocation** | Allocation, AllocationHistory | Assign, return, cancel |
| **Transfer** | Transfer | Request, approve, reject, complete |
| **Return** | Return | Condition assessment, damage notes |
| **Booking** | Booking | Date scheduling, workflow states |
| **Maintenance** | Maintenance, MaintenanceHistory | 7-state workflow, technician assignment |
| **Audit** | Audit, AuditItem, AuditAssignment, AuditDiscrepancy | Cycle management, item verification |
| **Organization** | Department, Employee, AssetCategory | Org structure management |
| **Notification** | Notification, NotificationPreference | Multi-channel, priorities, preferences |
| **Dashboard** | — | Summary stats, charts, analytics |
| **Reports** | — | Asset, allocation, maintenance, audit reports |
| **Settings** | Settings | Key-value configuration |
| **Activity Log** | ActivityLog | Full activity history |
| **Audit Trail** | AuditTrail | Compliance tracking |

---

## 🧪 Testing

The backend includes **13 test files** using Jest + Supertest + MongoDB Memory Server:

### Unit Tests (8)
- Auth validation
- RBAC permissions
- Asset service
- Organization service
- Audit service
- Audit trail service
- Notification service & templates
- Lifecycle service

### Integration Tests (5)
- Auth flow
- Observability
- Audit trail
- Activity log
- Notification delivery

```bash
cd backend
npm test
```

---

## 🚀 Deployment

### Environment Variables

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/assetflow
JWT_ACCESS_SECRET=your_secure_access_secret
JWT_REFRESH_SECRET=your_secure_refresh_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CORS_ORIGIN=https://your-domain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=1000
```

### Production Build

```bash
# Backend
cd backend
npm run build
npm start

# Frontend
cd frontend
npm run build
# Serve dist/ with nginx or any static server
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Quality
- ESLint + Prettier for formatting
- Husky pre-commit hooks with lint-staged
- TypeScript strict mode on both frontend and backend

---

## 📄 License

This project is licensed under the **MIT License**.

---

<div align="center">

**Built with ❤️ for Odoo x Hackathon 2026**

*AssetFlow — Complete Enterprise Asset Management*

</div>

# TaskFlow

<div align="center">

![TaskFlow](https://img.shields.io/badge/TaskFlow-Enterprise-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-47A248?style=for-the-badge&logo=mongodb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript)

**Enterprise Task Management Application**

*Replace Excel chaos with real-time SLA tracking, workforce accountability, and enterprise-grade security.*

[Features](#-features) • [Tech Stack](#-tech-stack) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Deployment](#-deployment)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Environment Variables](#-environment-variables)
- [User Roles & Permissions](#-user-roles--permissions)
- [API Documentation](#-api-documentation)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [Security](#-security)
- [License](#-license)

---

## 🎯 Overview

TaskFlow is a comprehensive enterprise task management solution designed to streamline workflow, enhance team collaboration, and provide real-time visibility into task progress. Built with modern web technologies, it offers a robust, scalable platform for managing tasks across different organizational hierarchies.

### Key Highlights

- **Role-Based Access Control**: Three-tier permission system (Super Admin, Admin, Core Manager)
- **Real-Time Notifications**: Instant updates on task assignments, completions, and comments
- **Advanced Filtering**: Filter tasks by status, priority, assignee, creator, and dates
- **Task Transfer & Assignment**: Flexible task management with transfer and shift assignee capabilities
- **Team Management**: Comprehensive team organization with statistics and permissions
- **Modern UI/UX**: Beautiful, responsive interface built with shadcn/ui and Tailwind CSS

---

## ✨ Features

### Task Management
- ✅ Create, read, update, and delete tasks
- ✅ Multiple assignees per task
- ✅ Priority levels (High, Medium, Low)
- ✅ Status tracking (Pending, In Progress, Completed, Delayed)
- ✅ Due date management with overdue indicators
- ✅ Task comments and collaboration
- ✅ Task archiving and restoration
- ✅ Created date and due date sorting

### Role-Based Features

#### Super Admin
- Manage all Administrators
- Control Admin permissions (Add, Edit, Delete members, Create/Delete tasks)
- View team statistics and analytics

#### Admin
- Full task management capabilities
- Add Core Managers and Admins to tasks
- Transfer tasks to other Admins
- Shift assignees (remove/add multiple)
- View all company tasks (except Core Manager to Core Manager tasks)
- Manage team members

#### Core Manager
- Create and assign tasks to other Core Managers
- Transfer own assignments to other Core Managers
- View tasks assigned to them and tasks they created
- Limited visibility scope

### Additional Features
- 📊 **Dashboard**: Real-time statistics and task overview
- 🔔 **Notifications**: Real-time updates for task events
- 👥 **Team Management**: Member management with statistics
- 🔍 **Advanced Filters**: Status, priority, assignee, creator, date sorting
- 🎨 **Modern UI**: Dark/Light theme support
- 📱 **Responsive Design**: Works on all devices
- 🔒 **Secure Authentication**: JWT-based authentication

---

## 🛠 Tech Stack

### Frontend
- **React 18.3** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - High-quality component library
- **React Router** - Client-side routing
- **TanStack Query** - Data fetching and caching
- **Axios** - HTTP client
- **date-fns** - Date manipulation
- **Lucide React** - Icon library

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - Authentication tokens
- **bcryptjs** - Password hashing
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing
- **Morgan** - HTTP request logger
- **node-cron** - Task scheduling

---

## 📁 Project Structure

```
TaskFlow/
├── server/                 # Backend application
│   ├── controllers/       # Route controllers
│   │   ├── auth.js        # Authentication logic
│   │   ├── tasks.js       # Task CRUD operations
│   │   ├── users.js       # User management
│   │   └── notifications.js # Notification handling
│   ├── models/            # Mongoose schemas
│   │   ├── User.js
│   │   ├── Task.js
│   │   ├── Team.js
│   │   └── Notification.js
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   │   └── auth.js       # JWT verification
│   ├── index.js          # Server entry point
│   └── package.json
│
├── src/                   # Frontend application
│   ├── components/        # React components
│   │   ├── dashboard/    # Dashboard components
│   │   ├── layout/       # Layout components
│   │   ├── tasks/       # Task-related components
│   │   └── ui/          # Reusable UI components
│   ├── contexts/         # React contexts
│   │   ├── AuthContext.tsx
│   │   ├── NotificationContext.tsx
│   │   └── ThemeContext.tsx
│   ├── hooks/            # Custom React hooks
│   ├── lib/             # Utility functions
│   ├── pages/           # Page components
│   ├── types/           # TypeScript types
│   └── main.tsx         # App entry point
│
├── .env.example          # Frontend environment template
├── server/.env.example   # Backend environment template
├── package.json
└── README.md
```

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18 or higher
- **MongoDB** (local installation or cloud instance)
- **npm** or **yarn** package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd TaskFlow
   ```

2. **Install Frontend Dependencies**
   ```bash
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd server
   npm install
   cd ..
   ```

4. **Set Up Environment Variables**

   **Backend** (`server/.env`):
   ```bash
   cp server/.env.example server/.env
   ```
   
   Edit `server/.env`:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/taskflow
   JWT_SECRET=your_super_secret_jwt_key_here
   ```

   **Frontend** (`.env`):
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env`:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

5. **Generate JWT Secret** (for production)
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

6. **Start Development Servers**

   **Option 1: Run separately**
   ```bash
   # Terminal 1 - Backend
   cd server
   npm run dev

   # Terminal 2 - Frontend
   npm run dev
   ```

   **Option 2: Run concurrently**
   ```bash
   npm run dev:all
   ```

7. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000

---

## 🔐 Environment Variables

### Backend (`server/.env`)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PORT` | Server port | No | `5000` |
| `MONGO_URI` | MongoDB connection string | **Yes** | - |
| `JWT_SECRET` | Secret key for JWT tokens | **Yes** | - |

### Frontend (`.env`)

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `VITE_API_URL` | Backend API URL | No | `http://localhost:5000/api` |

---

## 👥 User Roles & Permissions

### Super Admin
- **Highest level access**
- Manage all Administrators
- Control Admin permissions
- Cannot create or manage tasks directly

### Admin
- **Full task management**
- Create, edit, delete tasks
- Add Core Managers and Admins to tasks
- Transfer tasks to other Admins
- Shift assignees
- Manage team members
- View all company tasks (except Core Manager → Core Manager tasks)

### Core Manager
- **Limited task management**
- Create tasks and assign to other Core Managers
- Transfer own assignments
- View only assigned tasks and tasks they created
- Cannot see tasks assigned by other Core Managers to Core Managers

---

## 📡 API Documentation

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

### Tasks
- `GET /api/tasks` - Get all tasks (filtered by role)
- `POST /api/tasks` - Create a new task
- `PATCH /api/tasks/:id` - Update a task
- `DELETE /api/tasks/:id` - Delete a task
- `PATCH /api/tasks/:id/restore` - Restore archived task
- `POST /api/tasks/archive-old` - Archive old tasks

### Users
- `GET /api/users` - Get all users
- `GET /api/users/profile` - Get current user profile
- `PATCH /api/users/profile` - Update profile
- `POST /api/users` - Create new member
- `DELETE /api/users/:id` - Delete user
- `PATCH /api/users/:id/permissions` - Update admin permissions

### Notifications
- `GET /api/notifications` - Get all notifications
- `PATCH /api/notifications/:id/read` - Mark notification as read
- `PATCH /api/notifications/read-all` - Mark all as read

**Note**: All endpoints (except auth) require JWT token in `Authorization: Bearer <token>` header.

---

## 📚 Documentation

- **[PROJECT_FLOW.md](./PROJECT_FLOW.md)** - Complete project flow and architecture
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Step-by-step deployment guide

---

## 🚢 Deployment

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed deployment instructions covering:
- Git repository setup
- Docker containerization
- Render (Backend) deployment
- Vercel (Frontend) deployment

---

## 🔒 Security

### Security Features
- ✅ JWT-based authentication
- ✅ Password hashing with bcrypt
- ✅ Environment variable protection
- ✅ CORS configuration
- ✅ Helmet security headers
- ✅ Role-based access control
- ✅ Input validation

### Security Best Practices
- **Never commit `.env` files** to version control
- **Use strong JWT secrets** in production
- **Enable HTTPS** in production
- **Regular security updates** for dependencies
- **Validate all user inputs**
- **Implement rate limiting** for production

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

Copyright © 2025 AI GRP. All rights reserved.

This project is proprietary and confidential. Unauthorized copying, modification, distribution, or use of this software, via any medium, is strictly prohibited.

---

## 🙏 Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for the amazing component library
- [Lucide](https://lucide.dev/) for beautiful icons
- [Tailwind CSS](https://tailwindcss.com/) for utility-first CSS
- All contributors and users of TaskFlow

---

<div align="center">

**Built with ❤️ by AI GRP**

[Report Bug](https://github.com/your-repo/issues) • [Request Feature](https://github.com/your-repo/issues) • [Documentation](./PROJECT_FLOW.md)

</div>

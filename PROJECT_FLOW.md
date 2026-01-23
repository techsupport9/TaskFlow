# TaskFlow - Project Flow & Architecture

This document provides a comprehensive overview of the TaskFlow application's architecture, data flow, and system design.

---

## 📑 Table of Contents

1. [System Architecture](#system-architecture)
2. [Application Flow](#application-flow)
3. [Authentication Flow](#authentication-flow)
4. [Task Management Flow](#task-management-flow)
5. [Role-Based Access Control](#role-based-access-control)
6. [Data Models](#data-models)
7. [API Flow](#api-flow)
8. [Frontend Architecture](#frontend-architecture)
9. [Backend Architecture](#backend-architecture)
10. [State Management](#state-management)
11. [Notification System](#notification-system)

---

## 🏗 System Architecture

### High-Level Overview

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│   React Client  │ ◄─────► │  Express API    │ ◄─────► │   MongoDB       │
│   (Vite)        │  HTTP   │  (Node.js)      │  ODM    │   Database      │
│                 │         │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
      Port 5173                    Port 5000                  Port 27017
```

### Technology Stack

**Frontend:**
- React 18.3 with TypeScript
- Vite for build tooling
- TanStack Query for server state
- React Router for navigation
- Context API for global state

**Backend:**
- Node.js with Express.js
- MongoDB with Mongoose ODM
- JWT for authentication
- bcryptjs for password hashing

---

## 🔄 Application Flow

### 1. Initial Load Flow

```
User Opens Browser
    ↓
Load index.html
    ↓
React App Initializes (main.tsx)
    ↓
AuthContext Checks localStorage
    ↓
┌─────────────────┐
│ Has Token?      │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
   Yes       No
    │         │
    ↓         ↓
Dashboard   Login
Page        Page
```

### 2. User Journey Flow

```
┌──────────────┐
│   Login      │
└──────┬───────┘
       │
       ↓
┌──────────────┐
│  Dashboard   │ ──► View Statistics
└──────┬───────┘
       │
       ├──► Tasks ──► Create/View/Edit Tasks
       │
       ├──► Team ──► Manage Team Members
       │
       ├──► Archived ──► View Completed Tasks
       │
       └──► Settings ──► Update Profile
```

---

## 🔐 Authentication Flow

### Login Process

```
1. User enters email/password
   ↓
2. Frontend sends POST /api/auth/login
   ↓
3. Backend validates credentials
   ├─► Check user exists
   ├─► Verify password (bcrypt.compare)
   └─► Generate JWT token
   ↓
4. Backend returns { token, user }
   ↓
5. Frontend stores in localStorage
   ├─► Key: 'taskflow_user'
   └─► Value: { user, token }
   ↓
6. AuthContext updates state
   ↓
7. Redirect to Dashboard
```

### Token Verification Flow

```
Every API Request
   ↓
Frontend adds header: Authorization: Bearer <token>
   ↓
Backend middleware (verifyToken)
   ├─► Extract token from header
   ├─► Verify JWT signature
   ├─► Check token expiration
   └─► Fetch user from database
   ↓
Attach user to req.user
   ↓
Controller processes request
```

### Protected Routes

```typescript
// Frontend Route Protection
<Route path="/dashboard" element={
  <DashboardLayout>
    <Dashboard />
  </DashboardLayout>
} />

// DashboardLayout checks authentication
if (!isAuthenticated) {
  return <Navigate to="/login" replace />;
}
```

---

## 📋 Task Management Flow

### Task Creation Flow

```
1. User clicks "Create Task"
   ↓
2. CreateTaskModal opens
   ↓
3. User fills form:
   ├─► Title, Description
   ├─► Priority (High/Medium/Low)
   ├─► Due Date
   └─► Assignees (Multi-select)
   ↓
4. Frontend validates form
   ↓
5. POST /api/tasks
   ├─► Body: { title, description, priority, dueDate, assignments }
   └─► Headers: Authorization: Bearer <token>
   ↓
6. Backend Controller (createTask)
   ├─► Verify user role permissions
   ├─► Validate assignees (role-based)
   ├─► Create task in MongoDB
   ├─► Create notifications for assignees
   └─► Return created task
   ↓
7. Frontend updates cache (TanStack Query)
   ↓
8. UI updates with new task
```

### Task Visibility Flow

```
User Requests Tasks (GET /api/tasks)
   ↓
Backend Controller (getTasks)
   ↓
┌─────────────────────────┐
│ Check User Role        │
└───────────┬─────────────┘
            │
    ┌───────┼───────┐
    │       │       │
Super    Admin   Core
Admin            Manager
    │       │       │
    ↓       ↓       ↓
  []    All Tasks  Filtered
        (except   (Own tasks
         CM→CM)    + assigned)
```

### Task Transfer Flow

#### Admin Transferring to Another Admin

```
1. Admin opens task detail
   ↓
2. Clicks "Transfer to Admin"
   ↓
3. Selects target Admin
   ↓
4. PATCH /api/tasks/:id/transfer-admin
   ├─► Body: { targetAdminId }
   ↓
5. Backend (transferTaskToAdmin)
   ├─► Update task.createdBy = targetAdminId
   ├─► Add original Admin to excludedViewers
   ├─► Remove target Admin from excludedViewers
   ├─► Create notification
   └─► Return updated task
   ↓
6. Original Admin no longer sees task
7. Target Admin now owns task
```

#### Core Manager Transferring Assignment

```
1. Core Manager opens task
   ↓
2. Clicks "Transfer My Assignment"
   ↓
3. Selects target Core Manager
   ↓
4. PATCH /api/tasks/:id/transfer-assignment
   ├─► Body: { targetUserId }
   ↓
5. Backend (transferAssignment)
   ├─► Remove current user from assignments
   ├─► Add target user to assignments
   ├─► Add current user to excludedViewers
   ├─► Remove target user from excludedViewers
   ├─► Create notification
   └─► Return updated task
   ↓
6. Original Core Manager removed from task
7. Target Core Manager added to task
```

### Shift Assignee Flow

```
1. Admin opens task
   ↓
2. Clicks "Shift Assignee"
   ↓
3. Selects users to remove
4. Selects users to add
   ↓
5. PATCH /api/tasks/:id/shift-assignee
   ├─► Body: { fromUserIds: [], toUserIds: [] }
   ↓
6. Backend (shiftAssignee)
   ├─► Remove fromUserIds from assignments
   ├─► Add toUserIds to assignments
   ├─► Add removed users to excludedViewers
   ├─► Remove added users from excludedViewers
   ├─► Create notifications
   └─► Return updated task
```

---

## 👥 Role-Based Access Control

### Permission Matrix

| Action | Super Admin | Admin | Core Manager |
|--------|------------|-------|--------------|
| View Tasks | ❌ | ✅ (All except CM→CM) | ✅ (Own + Assigned) |
| Create Tasks | ❌ | ✅ | ✅ (To Core Managers only) |
| Edit Tasks | ❌ | ✅ | ✅ (Own tasks) |
| Delete Tasks | ❌ | ✅ | ❌ |
| Transfer Tasks | ❌ | ✅ (To Admins) | ✅ (Own assignment) |
| Add Assignees | ❌ | ✅ (Admins + CMs) | ✅ (Core Managers only) |
| Manage Team | ✅ (Admins only) | ✅ (Core Managers) | ❌ |
| Manage Permissions | ✅ | ❌ | ❌ |

### Visibility Rules

#### Super Admin
- **No task access** - Focuses on Admin management only

#### Admin
- **Sees all tasks** except:
  - Tasks created by Core Managers
  - Assigned only to Core Managers
  - Tasks in excludedViewers array

#### Core Manager
- **Sees tasks where:**
  - They are in assignments array
  - They created the task (createdBy)
  - Not in excludedViewers array

---

## 📊 Data Models

### User Model

```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  role: 'super_admin' | 'admin' | 'core_manager',
  department: String,
  phone: String,
  bio: String,
  companyId: String,
  teamId: ObjectId,
  visibilityScope: [ObjectId], // Users this CM can see
  permissions: {
    canAddMembers: Boolean,
    canEditMembers: Boolean,
    canDeleteMembers: Boolean,
    canCreateTasks: Boolean,
    canDeleteTasks: Boolean
  }
}
```

### Task Model

```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  priority: 'high' | 'medium' | 'low',
  status: 'pending' | 'in_progress' | 'completed' | 'delayed',
  dueDate: Date,
  createdAt: Date,
  updatedAt: Date,
  createdBy: ObjectId (ref: User),
  assignments: [{
    userId: ObjectId (ref: User),
    status: 'pending' | 'in_progress' | 'completed',
    progress: Number (0-100),
    completedAt: Date
  }],
  comments: [{
    userId: ObjectId,
    userName: String,
    content: String,
    createdAt: Date
  }],
  excludedViewers: [ObjectId], // Users who transferred out
  isArchived: Boolean,
  archivedAt: Date
}
```

### Notification Model

```javascript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  type: 'task_assigned' | 'task_completed' | 'task_transferred' | ...,
  title: String,
  message: String,
  taskId: ObjectId (ref: Task),
  isRead: Boolean,
  createdAt: Date
}
```

---

## 🔌 API Flow

### Request Flow

```
Client Request
   ↓
Express Middleware Stack
   ├─► CORS
   ├─► Helmet (Security)
   ├─► Morgan (Logging)
   ├─► express.json()
   └─► verifyToken (Auth)
   ↓
Route Handler
   ↓
Controller Function
   ├─► Validate input
   ├─► Check permissions
   ├─► Database operations
   └─► Send response
   ↓
Client receives response
```

### Error Handling Flow

```
Error Occurs
   ↓
Controller catches error
   ↓
┌─────────────────────┐
│ Error Type?        │
└─────────┬───────────┘
          │
    ┌─────┼─────┐
    │     │     │
  Validation  Auth   Server
    │     │     │
    ↓     ↓     ↓
  400   401   500
  ↓     ↓     ↓
Client receives error
   ↓
Frontend displays toast
```

---

## 🎨 Frontend Architecture

### Component Hierarchy

```
App
├── AuthProvider
│   ├── NotificationProvider
│   │   ├── ThemeProvider
│   │   │   ├── Router
│   │   │   │   ├── Index
│   │   │   │   ├── Login
│   │   │   │   └── DashboardLayout
│   │   │   │       ├── Sidebar
│   │   │   │       ├── Header
│   │   │   │       └── Pages
│   │   │   │           ├── Dashboard
│   │   │   │           ├── Tasks
│   │   │   │           ├── Team
│   │   │   │           └── Settings
```

### State Management

#### Global State (Context API)
- **AuthContext**: User authentication state
- **NotificationContext**: Notification state
- **ThemeContext**: Theme preferences

#### Server State (TanStack Query)
- **Tasks**: Cached task data
- **Users**: Cached user data
- **Notifications**: Cached notifications

#### Local State (useState)
- Form inputs
- UI state (modals, filters)
- Component-specific state

### Data Fetching Pattern

```typescript
// Using TanStack Query
const { data: tasks, isLoading } = useQuery({
  queryKey: ['tasks', filters],
  queryFn: () => api.get('/tasks', { params: filters }),
  staleTime: 30000, // 30 seconds
});

// Mutations
const createTaskMutation = useMutation({
  mutationFn: (newTask) => api.post('/tasks', newTask),
  onSuccess: () => {
    queryClient.invalidateQueries(['tasks']);
    toast.success('Task created!');
  },
});
```

---

## ⚙️ Backend Architecture

### Folder Structure

```
server/
├── controllers/     # Business logic
│   ├── auth.js
│   ├── tasks.js
│   ├── users.js
│   └── notifications.js
├── models/          # Database schemas
│   ├── User.js
│   ├── Task.js
│   ├── Team.js
│   └── Notification.js
├── routes/          # API endpoints
│   ├── auth.js
│   ├── tasks.js
│   ├── users.js
│   └── notifications.js
├── middleware/      # Custom middleware
│   └── auth.js
└── index.js         # Server entry
```

### Request Processing

```
HTTP Request
   ↓
index.js (Express App)
   ↓
Route Definition
   ↓
Middleware (verifyToken)
   ↓
Controller Function
   ├─► Extract data from req.body/req.params
   ├─► Validate input
   ├─► Check permissions (req.user.role)
   ├─► Database operations (Mongoose)
   ├─► Create notifications (if needed)
   └─► Send response (res.json())
```

### Database Operations

```javascript
// Example: Creating a task
const newTask = new Task({
  title: req.body.title,
  description: req.body.description,
  priority: req.body.priority,
  dueDate: req.body.dueDate,
  createdBy: req.user._id,
  assignments: formattedAssignments
});

await newTask.save();

// Populate related data
await newTask.populate('assignments.userId', 'name email');
await newTask.populate('createdBy', 'name');
```

---

## 🔔 Notification System

### Notification Flow

```
Event Occurs (Task Created/Transferred/etc.)
   ↓
Controller creates notification
   ↓
Notification saved to database
   ↓
Frontend polls or receives update
   ↓
NotificationContext updates
   ↓
UI displays notification badge
   ↓
User clicks notification
   ↓
Mark as read (PATCH /api/notifications/:id/read)
```

### Notification Types

- `task_assigned` - Task assigned to user
- `task_completed` - Task marked as completed
- `task_transferred` - Task transferred to user
- `task_commented` - Comment added to task
- `task_updated` - Task details updated
- `task_removed` - Task deleted

---

## 🔄 Data Synchronization

### Cache Invalidation Strategy

```typescript
// After creating a task
queryClient.invalidateQueries(['tasks']);

// After updating a task
queryClient.invalidateQueries(['tasks', taskId]);

// After deleting a task
queryClient.removeQueries(['tasks', taskId]);
```

### Optimistic Updates

```typescript
const updateTaskMutation = useMutation({
  mutationFn: updateTask,
  onMutate: async (newTask) => {
    // Cancel outgoing queries
    await queryClient.cancelQueries(['tasks', newTask.id]);
    
    // Snapshot previous value
    const previousTask = queryClient.getQueryData(['tasks', newTask.id]);
    
    // Optimistically update
    queryClient.setQueryData(['tasks', newTask.id], newTask);
    
    return { previousTask };
  },
  onError: (err, newTask, context) => {
    // Rollback on error
    queryClient.setQueryData(['tasks', newTask.id], context.previousTask);
  },
});
```

---

## 📝 Summary

TaskFlow follows a modern, scalable architecture:

1. **Separation of Concerns**: Clear separation between frontend and backend
2. **Role-Based Security**: Comprehensive permission system
3. **Real-Time Updates**: Notification system for task events
4. **Type Safety**: TypeScript on frontend for better DX
5. **Scalable Database**: MongoDB with proper indexing
6. **Modern Patterns**: React hooks, TanStack Query, Context API

This architecture supports:
- ✅ Easy feature additions
- ✅ Maintainable codebase
- ✅ Scalable to large teams
- ✅ Secure authentication
- ✅ Real-time collaboration

---

**For deployment instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)**

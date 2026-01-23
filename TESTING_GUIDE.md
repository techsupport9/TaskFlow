# Task Manager - Manual Testing Guide

Follow this guide to manually verify the application. All tests assume you are running the app on `http://localhost:8080` (or your configured port).

## 1. Authentication & Setup

**Goal**: Verify all user roles can log in and see their correct landing pages.

*   **Test 1: Admin Login**
    *   **Credentials**: `admin@acme.com` / `password123`
    *   **Action**: Login.
    *   **Expected**: Redirects to Dashboard. Sidebar shows "Team" (Admin/Manager only originally, now all).
    *   **Check**: Top right Avatar should say "Admin".

*   **Test 2: Manager Login**
    *   **Credentials**: `manager@acme.com` / `password123` (or any manager you created)
    *   **Action**: Login.
    *   **Expected**: Redirects to Dashboard. Sidebar shows "Team".
    *   **Check**: Top right Avatar should say "Manager".

*   **Test 3: Employee Login**
    *   **Credentials**: `jane@acme.com` / `password123`
    *   **Action**: Login.
    *   **Expected**: Redirects to Dashboard. Sidebar shows "Team".
    *   **Check**: Top right Avatar should say "Team Member".

---

## 2. Team Management (Admin & Manager)

**Goal**: Verify hierarchy management and role restrictions.

*   **Test 4: Admin Adds Manager**
    *   **Login as**: Admin.
    *   **Navigate**: Team Page.
    *   **Action**: Click "Add Member".
    *   **Form**: Name="Test Manager", Email="testmgr@example.com", Role="Manager".
    *   **Expected**: User added to list. Badge says "Manager".
    *   **Verify**: Logout and login as `testmgr@example.com` / `password123`. Should work.

*   **Test 5: Manager Adds Team Member**
    *   **Login as**: Manager.
    *   **Navigate**: Team Page.
    *   **Action**: Click "Add Member".
    *   **Form**: Name="New Dev", Email="dev@example.com", Role="Team Member".
    *   **Check**: **Role Dropdown should NOT show "Manager"**. (Restriction Check).
    *   **Expected**: User added.

*   **Test 6: Employee View (Read-Only)**
    *   **Login as**: Employee.
    *   **Navigate**: Team Page.
    *   **Expected**: Can view list of members.
    *   **Check**: **NO "Add Member" button**. **NO "Trash" icon** on member cards.

---

## 3. Task Management & Assignment (The Critical Path)

**Goal**: Verify the "Assign Task" flow and the "0 Tasks Visible" bug fix.

*   **Test 7: Admin Assigns Task to Manager**
    *   **Login as**: Admin.
    *   **Navigate**: Tasks -> Create Task.
    *   **Form**: Title="Admin Task", Assign To="Test Manager" (from Test 4). Visibility="Team" or "Public".
    *   **Action**: Create.
    *   **Check**: Task appears in Admin's list.
    *   **CRITICAL VERIFICATION**:
        1.  Go to "Team" page as Admin. Look at "Test Manager" card. Does it say **"Active: 1"** (or similar stats)? (If "0", bug persists).
        2.  Logout. Login as "Test Manager".
        3.  Check Dashboard. Does **"My Active Tasks"** show **1**?
        4.  Go to Tasks page. Is the task visible?

*   **Test 8: Manager Assigns Task to Team Member**
    *   **Login as**: Manager.
    *   **Navigate**: Tasks -> Create Task.
    *   **Assign To**: A team member (e.g., `jane@acme.com`).
    *   **Action**: Create.
    *   **Verify**: Logout. Login as Jane. Check Dashboard -> "My Active Tasks". Should be 1.

*   **Test 9: Employee "Self-Assign" Only**
    *   **Login as**: Employee.
    *   **Navigate**: Tasks -> Create Task.
    *   **Check**: "Assign To" dropdown should **only showing themselves** (or handle assignment automatically).
    *   **Action**: Create Task.
    *   **Expected**: Created successfully.

---

## 4. Dashboards (Role-Based Views)

**Goal**: Verify that Admins/Managers see Company/Team stats, while Employees see Personal stats.

*   **Test 10: Admin/Manager Dashboard**
    *   **Login as**: Admin or Manager.
    *   **Check**:
        *   "Total Active Tasks" (Company wide or Team wide).
        *   Charts (SLA, Status breakdown, Heatmap).
        *   "Department Performance".

*   **Test 11: Employee Dashboard**
    *   **Login as**: Employee.
    *   **Check**:
        *   **"My Active Tasks"** (Should match tasks assigned to them).
        *   **"My Performance"** (Completion rate).
        *   **NO** Company Charts (SLA, Dept Performance should be hidden).

---

## Known Fixes & Areas to Watch

1.  **"Cannot read properties of null (reading 'teamId')"**:
    *   *Fix Applied*: The server now strictly validates the user session against the database before processing requests.
    *   *Verification*: If you see this error, **Log Out and Log In** immediately to refresh your token.

2.  **"Manager sees 0 Tasks"**:
    *   *Fix Applied*: Updated Frontend (`Dashboard.tsx`, `Team.tsx`) to match User ID using `_id` (Database ID) correctly.
    *   *Verification*: Test 7 above specifically targets this.

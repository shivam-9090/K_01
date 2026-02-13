# Employee Permissions & Access Control

## Overview

This document describes the permissions and access control implemented for EMPLOYEE role users in the task management system.

## Navigation Changes

### For BOSS Users

- Dashboard
- **Projects** (all company projects)
- Employees (manage team)
- **Tasks** (all company tasks)
- Profile

### For EMPLOYEE Users

- Dashboard
- **My Projects** (only projects with assigned tasks)
- **Daily Tasks** (only assigned tasks)
- Profile

## Backend API Filtering

### Tasks Endpoint (`GET /tasks`)

**BOSS**: Returns all company tasks

```typescript
// No filtering - sees all tasks
const tasks = await prisma.task.findMany({
  where: { companyId },
});
```

**EMPLOYEE**: Returns only tasks assigned to them

```typescript
// Filtered by assignedToIds
const tasks = await prisma.task.findMany({
  where: {
    companyId,
    assignedToIds: { has: userId },
  },
});
```

### Projects Endpoint (`GET /projects`)

**BOSS**: Returns all company projects

```typescript
// No filtering - sees all projects
const projects = await prisma.project.findMany({
  where: { companyId },
});
```

**EMPLOYEE**: Returns only projects with assigned tasks

```typescript
// First get employee's tasks
const employeeTasks = await prisma.task.findMany({
  where: {
    companyId,
    assignedToIds: { has: userId },
  },
  select: { projectId: true },
});

// Get unique project IDs
const projectIds = [...new Set(employeeTasks.map((t) => t.projectId))];

// Fetch only these projects
const projects = await prisma.project.findMany({
  where: {
    companyId,
    id: { in: projectIds },
  },
});
```

### Project Details Endpoint (`GET /projects/:id/details`)

**BOSS**: Returns project with all tasks

```typescript
// No filtering - sees all tasks in project
const project = await prisma.project.findFirst({
  where: { id: projectId, companyId },
  include: { tasks: true },
});
```

**EMPLOYEE**: Returns project with only assigned tasks

```typescript
// Filter tasks by assignedToIds
const project = await prisma.project.findFirst({
  where: { id: projectId, companyId },
  include: { tasks: true },
});

// Filter tasks for employee
const filteredTasks = project.tasks.filter(
  (task) => task.assignedToIds && task.assignedToIds.includes(userId),
);
```

## Frontend Changes

### Navbar Component

- Displays "Tasks" for BOSS, "Daily Tasks" for EMPLOYEE
- Shows "My Projects" link only for EMPLOYEE
- Projects link for BOSS shows all projects

### Projects Page

- **Header**: Shows "Projects" for BOSS, "My Projects" for EMPLOYEE
- **Description**:
  - BOSS: "Manage your company projects"
  - EMPLOYEE: "Projects with tasks assigned to you"
- **Create Button**: Only visible for BOSS
- **Edit/Delete Buttons**: Only visible for BOSS

### Tasks Page

- Already filters tasks based on role (backend does the filtering)
- Shows all tasks for BOSS
- Shows only assigned tasks for EMPLOYEE

### Project Detail Page (Calendar)

- Shows all tasks on calendar for BOSS
- Shows only assigned tasks on calendar for EMPLOYEE
- Task cards clickable - navigates to Tasks page with highlight

## Route Protection

### Protected Routes (All Users)

- `/dashboard` - All authenticated users
- `/tasks` - All authenticated users (filtered by role)
- `/projects` - All authenticated users (filtered by role)
- `/projects/:id` - All authenticated users (filtered by role)
- `/profile` - All authenticated users

### BOSS-Only Routes

- `/employees` - BOSS only (manage team)

## API Permissions

### BOSS Can:

- ✅ Create projects
- ✅ Update projects
- ✅ Delete projects
- ✅ Create tasks
- ✅ Update tasks
- ✅ Delete tasks
- ✅ View all company projects
- ✅ View all company tasks
- ✅ Manage employees
- ✅ Suggest employees for tasks
- ✅ View project analytics

### EMPLOYEE Can:

- ✅ View projects with assigned tasks
- ✅ View only assigned tasks
- ✅ View task details (if assigned)
- ✅ View project details (if has assigned tasks)
- ❌ Create projects
- ❌ Update projects
- ❌ Delete projects
- ❌ Create tasks
- ❌ Update tasks
- ❌ Delete tasks
- ❌ View other employees' tasks
- ❌ Manage employees

## Implementation Files Modified

### Backend

1. **`src/projects/projects.controller.ts`**
   - Updated `getAllProjects()` to accept userId and role
   - Updated `getProjectDetails()` to accept userId and role

2. **`src/projects/projects.service.ts`**
   - Modified `getAllProjects()` to filter by assigned tasks for employees
   - Modified `getProjectWithTasks()` to filter tasks for employees

3. **`src/tasks/tasks.controller.ts`**
   - Already implemented role-based filtering

4. **`src/tasks/tasks.service.ts`**
   - Already implemented role-based filtering in `getAllTasks()`

### Frontend

1. **`src/components/Navbar.tsx`**
   - Changed "Tasks" to "Daily Tasks" for employees
   - Added "My Projects" link for employees

2. **`src/App.tsx`**
   - Removed `requireBoss` from `/projects` route
   - Removed `requireBoss` from `/projects/:id` route

3. **`src/pages/Projects.tsx`**
   - Updated header text based on role
   - Create button only visible for BOSS
   - Updated description based on role

4. **`src/pages/Tasks.tsx`**
   - Already handles role-based data from backend

## Testing Checklist

### As BOSS

- [ ] Can see "Projects" and "Tasks" in navbar
- [ ] Can see all company projects
- [ ] Can see all company tasks
- [ ] Can create/edit/delete projects
- [ ] Can create/edit/delete tasks
- [ ] Can access employee management

### As EMPLOYEE

- [ ] Can see "My Projects" and "Daily Tasks" in navbar
- [ ] Can only see projects with assigned tasks
- [ ] Can only see assigned tasks
- [ ] Cannot see create/edit/delete buttons
- [ ] Cannot access employee management
- [ ] Project calendar shows only assigned tasks

## Security Notes

1. **Backend Validation**: All filtering happens on the backend, frontend just displays data
2. **JWT Role**: User role is verified via JWT token on every request
3. **Company Isolation**: All queries filter by companyId to prevent cross-company access
4. **Task Assignment**: Tasks must be explicitly assigned via assignedToIds array

## Future Enhancements

1. **Task Status Updates**: Allow employees to update status of their own tasks
2. **Comments**: Allow employees to comment on assigned tasks
3. **Notifications**: Notify employees when new tasks are assigned
4. **Task Filtering**: Add filter by status, priority on employee view
5. **Calendar View**: Employee-specific calendar showing only assigned tasks

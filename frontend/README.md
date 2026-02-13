# Frontend - Task Management System

React + TypeScript frontend for the Task Management System.

## 🚀 Quick Start

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/        # Reusable components
│   │   ├── Layout.tsx
│   │   ├── Navbar.tsx
│   │   └── ProtectedRoute.tsx
│   ├── context/          # State management
│   │   └── AuthContext.tsx
│   ├── pages/            # Page components
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Projects.tsx
│   │   ├── Employees.tsx
│   │   ├── Tasks.tsx
│   │   └── Profile.tsx
│   ├── services/         # API services
│   │   ├── api.ts
│   │   ├── auth.service.ts
│   │   ├── project.service.ts
│   │   ├── employee.service.ts
│   │   └── task.service.ts
│   ├── types/           # TypeScript types
│   │   └── index.ts
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── public/              # Static assets
├── index.html          # HTML template
├── package.json        # Dependencies
├── tsconfig.json       # TypeScript config
├── vite.config.ts      # Vite config
└── .env                # Environment variables
```

## 🎨 Features

### Authentication

- Login with email/password
- JWT token management
- Auto-redirect to dashboard after login
- Protected routes

### Dashboard

- Overview of projects, tasks, employees
- Role-based content (BOSS vs EMPLOYEE)
- Quick navigation

### Projects (BOSS only)

- Create projects
- View all projects
- Delete projects
- Project details with dates

### Employees (BOSS only)

- Add employees with skills
- View all employees
- Skills management
- Delete employees

### Tasks

- **BOSS**: Create and assign tasks to employees
- **BOSS**: Smart employee suggestions based on skills
- **EMPLOYEE**: View assigned tasks only
- Task filtering by status
- Complete tasks
- Task details with project info

### Profile

- View account information
- Change password
- View skills (for employees)

## 🎨 Design System

- **Font**: Inter (Google Fonts)
- **Theme**: Clean white design
- **Colors**:
  - Primary: `#1a1a1a` (black)
  - Background: `#ffffff` (white)
  - Border: `#e5e5e5`
  - Text: `#1a1a1a`, `#6b7280`

## 🔌 API Integration

The frontend connects to the backend API at `http://localhost:3000`.

Endpoints used:

- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `GET /auth/profile` - Get user profile
- `GET /projects` - Get all projects
- `POST /projects` - Create project
- `GET /employees` - Get all employees
- `POST /employees` - Create employee
- `GET /tasks` - Get all tasks
- `POST /tasks` - Create task
- `GET /tasks/suggest-employees` - Smart employee suggestions

## 🔐 Authentication Flow

1. User enters credentials on `/login`
2. Frontend sends POST to `/auth/login`
3. Backend returns JWT tokens + user data
4. Frontend stores in localStorage
5. All API requests include JWT in Authorization header
6. If token expires, user is redirected to login

## 👥 Role-Based Access

### BOSS Role

- Full access to all pages
- Can create projects, employees, and tasks
- Can assign tasks to employees
- Sees all company data

### EMPLOYEE Role

- Limited access
- Cannot create projects or employees
- Can only view assigned tasks
- Can complete tasks

## 🛠️ Technologies

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router 6** - Routing
- **Axios** - HTTP client
- **Zustand** - State management
- **CSS** - Styling (no framework)

## 📝 Environment Variables

Create a `.env` file:

```env
VITE_API_URL=http://localhost:3000
```

## 🚀 Deployment

### Build

```bash
npm run build
```

The build output will be in the `dist` folder.

### Deploy to Vercel/Netlify

1. Connect your repository
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Set environment variables:
   - `VITE_API_URL`: Your production API URL

## 📱 Features Implemented

✅ Login page with authentication
✅ Dashboard with role-based content
✅ Projects management (BOSS only)
✅ Employee management with skills (BOSS only)
✅ Smart task assignment with skill matching
✅ Task filtering for employees (only assigned tasks)
✅ Profile management
✅ Password change
✅ Responsive design
✅ Clean white theme with Inter font
✅ Protected routes
✅ JWT token management
✅ Error handling

## 🎯 Smart Task Assignment

When creating a task:

1. Select task type (frontend, backend, ai/ml, etc.)
2. System suggests employees with matching skills FIRST
3. Search employees by email
4. Employees with matching skills are highlighted
5. Assign to one or multiple employees

## 🔄 Workflow

1. **Login** → Redirects to Dashboard
2. **Dashboard** → Quick links to all features
3. **BOSS creates Project** → Project available for tasks
4. **BOSS creates Employee** → Employee can be assigned tasks
5. **BOSS creates Task** → Assigns to employees with matching skills
6. **EMPLOYEE sees Task** → Only their assigned tasks
7. **EMPLOYEE completes Task** → Status updated

## 💡 Tips

- Use Chrome DevTools to inspect API calls
- Check Network tab for API responses
- localStorage stores auth tokens
- Clear localStorage to force re-login

import React, { useEffect, Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuthStore } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Spinner } from "./components/ui/spinner";
import { Toaster } from "./components/ui/sonner";

// Eager load auth pages (small & needed immediately)
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { TwoFAVerify } from "./pages/TwoFAVerify";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";

// Lazy load heavy protected pages (code splitting for performance)
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const Employees = lazy(() => import("./pages/Employees"));
const EmployeeDetail = lazy(() => import("./pages/EmployeeDetail"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Profile = lazy(() => import("./pages/Profile"));
const GitHubCallback = lazy(() => import("./pages/GitHubCallback"));

const App: React.FC = () => {
  const { loadUserFromStorage, isAuthenticated } = useAuthStore();

  useEffect(() => {
    loadUserFromStorage();
  }, [loadUserFromStorage]);

  return (
    <ErrorBoundary>
      <Router>
        <Toaster />
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <Spinner className="h-8 w-8 text-primary mx-auto" />
                <p className="mt-2 text-muted-foreground">Loading...</p>
              </div>
            </div>
          }
        >
          <Routes>
            {/* Public Routes */}
            <Route
              path="/login"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Login />
                )
              }
            />

            <Route
              path="/register"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Register />
                )
              }
            />

            {/* 2FA Verification Route */}
            <Route path="/2fa-verify" element={<TwoFAVerify />} />

            {/* Password Reset Routes */}
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/projects"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Projects />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/projects/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ProjectDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/employees"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Employees />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/employees/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <EmployeeDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/tasks"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Tasks />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Profile />
                  </Layout>
                </ProtectedRoute>
              }
            />

            <Route
              path="/github/callback"
              element={
                <ProtectedRoute>
                  <GitHubCallback />
                </ProtectedRoute>
              }
            />

            {/* Redirect root to login or dashboard */}
            <Route
              path="/"
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            {/* Catch all - show 404 */}
            <Route
              path="*"
              element={
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <h1 className="text-6xl font-bold text-gray-900 mb-4">
                      404
                    </h1>
                    <p className="text-xl text-gray-600 mb-4">Page not found</p>
                    <p className="text-sm text-gray-500">
                      The page you're looking for doesn't exist.
                    </p>
                  </div>
                </div>
              }
            />
          </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
};

export default App;

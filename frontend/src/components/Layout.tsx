import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  CheckSquare,
  User,
  LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./Layout.css";

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>K_01</h2>{" "}
          {user && (
            <div
              style={{
                marginTop: "1rem",
                fontSize: "0.9rem",
                color: "#a1a1aa",
              }}
            >
              <p>{user.email}</p>
              <p style={{ fontSize: "0.8rem" }}>{user.role}</p>
            </div>
          )}{" "}
        </div>
        <nav className="sidebar-nav">
          <Link
            to="/dashboard"
            className={`nav-item ${isActive("/dashboard") ? "active" : ""}`}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>
          <Link
            to="/projects"
            className={`nav-item ${isActive("/projects") ? "active" : ""}`}
          >
            <FolderKanban size={20} />
            <span>Projects</span>
          </Link>
          <Link
            to="/tasks"
            className={`nav-item ${isActive("/tasks") ? "active" : ""}`}
          >
            <CheckSquare size={20} />
            <span>Tasks</span>
          </Link>
          <Link
            to="/employee"
            className={`nav-item ${isActive("/employee") ? "active" : ""}`}
          >
            <Users size={20} />
            <span>Employees</span>
          </Link>
          <Link
            to="/profile"
            className={`nav-item ${isActive("/profile") ? "active" : ""}`}
          >
            <User size={20} />
            <span>Profile</span>
          </Link>
          <button
            onClick={handleLogout}
            className="nav-item"
            style={{
              border: "none",
              background: "transparent",
              width: "100%",
              textAlign: "left",
              marginTop: "auto",
              color: "#a1a1aa",
            }}
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;

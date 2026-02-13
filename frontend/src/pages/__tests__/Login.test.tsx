import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { Login } from "../Login";

// Mock the auth store
vi.mock("../../context/AuthContext", () => ({
  useAuthStore: vi.fn(() => ({
    login: vi.fn(),
    isAuthenticated: false,
  })),
}));

// Mock react-router-dom
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

describe("Login Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render login form", () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>,
    );

    expect(screen.getByRole("heading", { name: /login/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it("should show validation errors for empty fields", async () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>,
    );

    const submitButton = screen.getByRole("button", { name: /sign in/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  it("should show validation error for invalid email", async () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>,
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole("button", { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
  });

  it("should have link to register page", () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>,
    );

    const registerLink = screen.getByText(/create account/i);
    expect(registerLink).toBeInTheDocument();
    expect(registerLink.closest("a")).toHaveAttribute("href", "/register");
  });
});

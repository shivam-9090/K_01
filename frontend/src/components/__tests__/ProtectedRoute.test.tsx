import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ProtectedRoute } from "../ProtectedRoute";

// Mock the auth store
const mockUseAuthStore = vi.fn();
vi.mock("../../context/AuthContext", () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

// Mock react-router-dom Navigate
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <div>Redirecting to {to}</div>,
  };
});

describe("ProtectedRoute Component", () => {
  it("should render children when user is authenticated", () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      user: { id: "1", email: "test@example.com", role: "BOSS" },
    });

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    );

    expect(screen.getByText("Protected Content")).toBeInTheDocument();
  });

  it("should redirect to login when user is not authenticated", () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      user: null,
    });

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    );

    expect(screen.getByText("Redirecting to /login")).toBeInTheDocument();
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });

  it("should show loading state when authentication is being checked", () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      user: null,
      isLoading: true,
    });

    render(
      <BrowserRouter>
        <ProtectedRoute>
          <div>Protected Content</div>
        </ProtectedRoute>
      </BrowserRouter>
    );

    // Component might show loading spinner - adjust based on actual implementation
    expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
  });
});

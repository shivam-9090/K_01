import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuthStore } from "../AuthContext";

// Mock the auth service
vi.mock("../../services/auth.service", () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

// Mock query client
vi.mock("../../lib/query-client", () => ({
  queryClient: {
    clear: vi.fn(),
  },
}));

describe("AuthContext - useAuthStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("should initialize with default values", () => {
    const { result } = renderHook(() => useAuthStore());

    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  it("should load user from localStorage on mount", () => {
    const mockUser = {
      id: "1",
      email: "test@example.com",
      role: "BOSS",
    };
    const mockToken = "mock-token-123";

    localStorage.setItem("user", JSON.stringify(mockUser));
    localStorage.setItem("accessToken", mockToken);

    const { result } = renderHook(() => useAuthStore());
    
    // Call loadUserFromStorage
    result.current.loadUserFromStorage();

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.accessToken).toBe(mockToken);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("should update user state", () => {
    const { result } = renderHook(() => useAuthStore());
    
    const newUser = {
      id: "1",
      email: "updated@example.com",
      role: "EMPLOYEE",
      companyId: "company-1",
    };

    localStorage.setItem("accessToken", "mock-token");
    result.current.updateUser(newUser);

    expect(result.current.user).toEqual(newUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("should clear user state on logout", async () => {
    const { result } = renderHook(() => useAuthStore());

    // Set initial state
    localStorage.setItem("user", JSON.stringify({ id: "1" }));
    localStorage.setItem("accessToken", "token");
    result.current.loadUserFromStorage();

    // Logout
    await result.current.logout();

    expect(result.current.user).toBeNull();
    expect(result.current.accessToken).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem("user")).toBeNull();
    expect(localStorage.getItem("accessToken")).toBeNull();
  });
});

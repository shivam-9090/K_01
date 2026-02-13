import axios, { AxiosInstance, AxiosError } from "axios";
import { toast } from "sonner";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem("accessToken");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor to handle errors
    this.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 403) {
          const errorMessage =
            (error.response?.data as any)?.message ||
            "You don't have permission to perform this action.";
          toast.error("Permission Denied", {
            description: errorMessage,
          });
        }

        if (error.response?.status === 401) {
          const errorMessage = (error.response?.data as any)?.message || "";
          const requestUrl = error.config?.url || "";

          // Check if this is a GitHub-specific error (not a general auth failure)
          const isGitHubError =
            requestUrl.includes("/github") ||
            errorMessage.toLowerCase().includes("github");

          if (isGitHubError) {
            // Don't redirect to login, let the component handle this error
            return Promise.reject(error);
          }

          // Log to localStorage so we can check after redirect
          const errorLog = {
            timestamp: new Date().toISOString(),
            url: requestUrl,
            status: error.response?.status,
            message: errorMessage,
          };
          localStorage.setItem("lastApiError", JSON.stringify(errorLog));

          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }
        return Promise.reject(error);
      },
    );
  }

  getInstance() {
    return this.api;
  }
}

export const apiService = new ApiService();
export const api = apiService.getInstance();

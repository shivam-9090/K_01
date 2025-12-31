import axios from "axios";

// BACKEND INTEGRATION DISABLED FOR NOW
// When ready to connect, change BACKEND_ENABLED to true and set correct baseURL
const BACKEND_ENABLED = false;

const api = axios.create({
  baseURL: BACKEND_ENABLED ? "http://localhost:3000" : "", // Backend disabled
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to add the auth token to every request
api.interceptors.request.use(
  (config) => {
    // If backend is disabled, reject the request
    if (!BACKEND_ENABLED) {
      return Promise.reject(new Error("Backend integration is currently disabled"));
    }
    
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear auth and redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;

/**
 * Axios Configuration with Interceptors
 * 
 * Handles automatic logout on 401 SESSION_EXPIRED responses
 * 
 * This module sets up global axios interceptors that will handle
 * session expiration errors across the entire application.
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

// Only set up interceptors on the client side
if (typeof window !== "undefined") {
  // Request interceptor - add token if available (though it's in HttpOnly cookie)
  axios.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Token is in HttpOnly cookie, so we don't need to add it manually
      // But we ensure credentials are sent
      config.withCredentials = true;
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - handle 401 SESSION_EXPIRED
  axios.interceptors.response.use(
    (response) => {
      return response;
    },
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        const errorData = error.response.data as any;
        
        // Check if it's a SESSION_EXPIRED error
        if (errorData?.error === "SESSION_EXPIRED" || errorData?.error === "UNAUTHORIZED") {
          const message = errorData?.message || "Session expired at 11:00 PM IST. Please log in again.";
          
          // Clear any client-side token storage (if any)
          localStorage.removeItem("token");
          sessionStorage.removeItem("token");
          
          // Clear auth store if using Zustand
          try {
            const { useAuthStore } = require("@/AuthStore");
            const store = useAuthStore.getState();
            if (store?.setToken) {
              store.setToken(null as any);
            }
            if (store?.token) {
              store.token = null as any;
            }
          } catch (e) {
            // AuthStore might not be available, ignore
          }
          
          // Redirect to login
          window.location.href = "/login";
          
          // Log the session expiry
          console.log("🔒 " + message);
          
          // Return a rejected promise with the error
          return Promise.reject(new Error(message));
        }
        
        // For other 401 errors, return generic error
        return Promise.reject(new Error("Unauthorized"));
      }
      
      // For other errors, just pass them through
      return Promise.reject(error);
    }
  );
}

// Export default axios (with interceptors set up)
export default axios;


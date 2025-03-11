// frontend/src/services/api.ts
import axios, { AxiosRequestConfig } from "axios";
import { toast } from "sonner";

// Flag to determine if we should use sample data or actual API calls
// This comes from the environment variables
export const USE_SAMPLE_DATA = import.meta.env.VITE_USE_SAMPLE_DATA === "true";

// Create API client instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1",
  timeout: 30000, // 30 seconds
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    // You can add any request modifications here (e.g. auth tokens)
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // When using sample data, don't show error toasts for API failures
    if (!USE_SAMPLE_DATA) {
      const errorMessage =
        error.response?.data?.message || error.message || "An error occurred";

      // Show error toast
      toast.error(errorMessage);
    } else {
      // Just log the error when in sample data mode
      console.warn(
        "API error occurred but hidden due to USE_SAMPLE_DATA=true:",
        error.message
      );
    }

    return Promise.reject(error);
  }
);

// Define types for API responses
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status?: number;
}

// Create wrapper functions for common HTTP methods that respect the sample data flag
export async function get<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  // We still make the actual API call and let the service handlers catch the error if needed
  const response = await api.get<ApiResponse<T>>(url, config);
  return response.data as T;
}

export async function post<T>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await api.post<ApiResponse<T>>(url, data, config);
  return response.data as T;
}

export async function put<T>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await api.put<ApiResponse<T>>(url, data, config);
  return response.data as T;
}

export async function del<T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<T> {
  const response = await api.delete<ApiResponse<T>>(url, config);
  return response.data as T;
}

// Log whether we're using sample data or real API
console.log(`API Mode: ${USE_SAMPLE_DATA ? "Sample Data" : "Real API"}`);

export default api;

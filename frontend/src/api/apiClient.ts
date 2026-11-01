import axios, {
  AxiosInstance,
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";
import SERVICE_CONFIG from "./serviceConfig";
import { ServiceType } from "./endpoints";

// Store axios instance for primary service
// Additional services can be added when needed
const apiClients: Record<ServiceType, AxiosInstance> = {
  PRIMARY: createAxiosInstance("PRIMARY"),
  SERVICE_2: null as any, // Placeholder - uncomment in serviceConfig.ts to enable
  SERVICE_3: null as any, // Placeholder - uncomment in serviceConfig.ts to enable
};

// Factory function to create axios instance for a specific service
function createAxiosInstance(service: ServiceType): AxiosInstance {
  const config = SERVICE_CONFIG[service];

  const instance = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });

  // Request interceptor - attach JWT token to requests
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = localStorage.getItem("authToken");
      // const token = "eyJhbGciOiJIUzUxMiJ9.eyJhdXRob3JpdGllcyI6WyJDT05TVU1FUiJdLCJzdWIiOiIyNzQ0N2JiMy1lYzVjLTQ2MWEtYjhjNS01ZmJiMDk2MGQxYzEiLCJpYXQiOjE3ODIxMTE0NDIsImV4cCI6MTc4MjcxNjI0Mn0.Y78byF7plUtoM0Lhl-fGALp8sl2E_2Ml8fUzK5J5I-t3Af9rELRqd5TuF6XZ6R8VPJvnycmOTmHFmquTmhWFUw";
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      return config;
    },
    (error: AxiosError) => {
      return Promise.reject(error);
    },
  );

  // Response interceptor - handle errors and token refresh
  instance.interceptors.response.use(
    (response: AxiosResponse) => {
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & {
        _retry?: boolean;
      };

      // Handle 401 Unauthorized
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        // Clear authentication and redirect to login
        localStorage.removeItem("authToken");
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("userType");

        // Optionally redirect to login page
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }

        return Promise.reject(error);
      }

      // Handle 403 Forbidden
      if (error.response?.status === 403) {
        console.error("Access forbidden:", error.response.data);
      }

      // Handle network errors
      if (!error.response) {
        console.error("Network error:", error.message);
      }

      return Promise.reject(error);
    },
  );

  return instance;
}

// Get API client for a specific service
export function getApiClient(service: ServiceType = "PRIMARY"): AxiosInstance {
  const client = apiClients[service];

  // If service is not configured, fall back to PRIMARY
  if (!client) {
    console.warn(
      `Service ${service} is not configured. Falling back to PRIMARY service.`,
    );
    return apiClients.PRIMARY;
  }

  return client;
}

// Default export is the primary service client for backward compatibility
const apiClient = apiClients.PRIMARY;

export default apiClient;

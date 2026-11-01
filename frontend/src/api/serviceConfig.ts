// @ts-nocheck

/**
 * Service Configuration
 *
 * Centralized configuration for multiple backend services.
 * Supports different base URLs for different microservices.
 */

/**
 * Returns the current environment based on the browser's hostname.
 *  - 'prolt' → prolt.energy  (production meter insights portal)
 *  - 'dev'   → dev.prolt.energy or any other domain (standard app)
 */
export function getEnv(): "prod" | "dev" {
  const hostname = window.location.hostname;
  if (hostname === "prolt.energy") return "prod";
  return "dev";
}

function getBaseUrl() {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  const { protocol, hostname, port } = window.location;
  if (hostname === "prolt.energy") {
    return "https://prolt.energy:5001";
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return "http://localhost:5001";
  }
  // Server IP mappings
  if (port === '8083') {
    return `${protocol}//${hostname}:5002`;
  }
  return `${protocol}//${hostname}:5001`;
}

export const SERVICE_CONFIG = {
  // Primary service on port 7070
  PRIMARY: {
    baseURL: getBaseUrl(),
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || "180000"),
  },

  // Additional services (add as needed)
  SERVICE_2: {
    baseURL: import.meta.env.VITE_API_SERVICE_2_URL || "http://localhost:5001",
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || "180000"),
  },

  SERVICE_3: {
    baseURL:
      import.meta.env.VITE_API_SERVICE_3_URL ||
      "http://localhost:5002",
    timeout: parseInt(import.meta.env.VITE_API_TIMEOUT || "180000"),
  },
} as const;

export default SERVICE_CONFIG;

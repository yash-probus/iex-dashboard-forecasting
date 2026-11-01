// @ts-nocheck

import { removeAllDataFromLocalStorage } from "@/utils/global";
import { getApiClient } from "./apiClient";
import API_ENDPOINTS from "./endpoints";

// Registration request payload
export interface RegistrationRequestPayload {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  password: string;
  role: "CONSUMER" | "TRADER";
}

// Registration request response
export interface RegistrationRequestResponse {
  requestCode: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: string;
  updatedTime: string;
  creationTime: string;
}

// Send OTP payload
export interface SendOTPPayload {
  requestCode: string;
}

// Verify registration payload
export interface VerifyRegistrationPayload {
  requestCode: string;
  oneTimePassword: string;
  captchaAnswer: string;
}

// Login Auth Payload
export interface LoginPayload {
  email: string;
  role: string;
  deviceId: string;
  password: string;
  captchaAnswer: string;
}

// Authentication service functions
export const authService = {
  // Step 1: Create registration request
  async registrationRequest(
    payload: RegistrationRequestPayload,
  ): Promise<RegistrationRequestResponse> {
    const endpoint = API_ENDPOINTS.AUTH.REGISTRATION_REQUEST;
    const apiClient = getApiClient(endpoint.service);

    const response = await apiClient.post<RegistrationRequestResponse>(
      endpoint.path,
      payload,
    );
    return response.data;
  },

  // Step 2: Send OTP to user
  async sendOTP(payload: SendOTPPayload): Promise<void> {
    const endpoint = API_ENDPOINTS.AUTH.SEND_OTP;
    const apiClient = getApiClient(endpoint.service);

    await apiClient.post(endpoint.path, payload);
  },

  // Step 3: Verify registration with OTP
  async verifyRegistration(payload: VerifyRegistrationPayload): Promise<any> {
    const endpoint = API_ENDPOINTS.AUTH.VERIFY_REGISTRATION;
    const apiClient = getApiClient(endpoint.service);

    const response = await apiClient.post(endpoint.path, payload);

    // If verification successful and token is returned, store it
    if (response.data.token) {
      localStorage.setItem("authToken", response.data.token);
      localStorage.setItem("isLoggedIn", "true");
    }

    return response.data;
  },

  // Logout user
  async logout(): Promise<void> {
    localStorage.removeItem("authToken");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("userType");
    removeAllDataFromLocalStorage();
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return (
      localStorage.getItem("isLoggedIn") === "true" &&
      !!localStorage.getItem("authToken")
    );
  },

  // get User Name
  getUserName(): string {
    const name = localStorage.getItem("user");
    return JSON.parse(name)?.displayName || "User";
  },

  // Get current auth token
  getToken(): string | null {
    return localStorage.getItem("authToken");
  },

  // Get captcha image for registration
  async getCaptcha(
    requestCode: string,
  ): Promise<{ image: string; captchaId: string }> {
    const endpoint = API_ENDPOINTS.CAPTCHA.REGISTRATION;
    const apiClient = getApiClient(endpoint.service);

    // Request as arraybuffer since the response is a binary image
    const response = await apiClient.get(endpoint.path, {
      params: { requestCode },
      responseType: "arraybuffer",
    });

    // Convert binary data to base64 string
    const base64 = btoa(
      new Uint8Array(response.data).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        "",
      ),
    );

    const mimeType = response.headers["content-type"] || "image/png";
    const image = `data:${mimeType};base64,${base64}`;

    // Since response is direct image, we don't get a captchaId in body.
    // The verification likely relies on the requestCode context.
    return {
      image,
      captchaId: "",
    };
  },

  // Get captcha image for login
  async getCaptchaLogin(
    email: string,
    deviceId: string,
  ): Promise<{ image: string; captchaId: string }> {
    const endpoint = API_ENDPOINTS.CAPTCHA.LOGIN;
    const apiClient = getApiClient(endpoint.service);

    // Request as arraybuffer since the response is a binary image
    const response = await apiClient.get(endpoint.path, {
      params: { email, deviceId },
      responseType: "arraybuffer",
    });

    // Convert binary data to base64 string
    const base64 = btoa(
      new Uint8Array(response.data).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        "",
      ),
    );

    const mimeType = response.headers["content-type"] || "image/png";
    const image = `data:${mimeType};base64,${base64}`;

    // Since response is direct image, we don't get a captchaId in body.
    // The verification likely relies on the requestCode context.
    return {
      image,
      captchaId: "",
    };
  },

  // Login user with auth
  async login(payload: LoginPayload): Promise<any> {
    const endpoint = API_ENDPOINTS.AUTH.LOGIN;
    const apiClient = getApiClient(endpoint.service);

    const response = await apiClient.post(endpoint.path, payload);

    // If login successful and token is returned, store it
    if (response.data.token) {
      localStorage.setItem("authToken", response.data.token);
      localStorage.setItem("isLoggedIn", "true");
    }

    return response.data;
  },

  async resetRequest(email: string): Promise<void> {
    const endpoint = API_ENDPOINTS.PASSWORD.RESET_REQUEST;
    const apiClient = getApiClient(endpoint.service);

    const res = await apiClient.post(endpoint.path, { email });
    return res.data;
  },
  async resetOtpSent(requestCode: string): Promise<void> {
    const endpoint = API_ENDPOINTS.PASSWORD.RESET_OTP_SENT;
    const apiClient = getApiClient(endpoint.service);

    await apiClient.post(endpoint.path, { requestCode });
  },
  async resetPassword(data: {}): Promise<void> {
    const endpoint = API_ENDPOINTS.PASSWORD.RESET_PASSWORD;
    const apiClient = getApiClient(endpoint.service);

    await apiClient.post(endpoint.path, data);
  },
};

export default authService;

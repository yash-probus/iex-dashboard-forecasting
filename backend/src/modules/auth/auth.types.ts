export interface LoginDTO {
  username?: string;
  password?: string;
}

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  role: string;
  hiddenModules?: string[];
  readOnlyModules?: string[];
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: UserResponse;
}

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { AUTH_TOKEN_KEY } from '../constants/auth';
import { authEventEmitter } from '../utils/events';
import { AppUser } from '../api/auth.api';

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  token: string | null;
  user: AppUser | null;
  authLoading: boolean;
  login: (token: string, user: AppUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);

  // Deliverable A1: Bootstrapping & Restore Session
  useEffect(() => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    const storedUser = localStorage.getItem('iex_user');
    
    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        setIsAuthenticated(true);
        setIsAdmin(parsedUser.role === 'ADMIN' || parsedUser.role === 'SUPER_ADMIN');
        setIsSuperAdmin(parsedUser.role === 'SUPER_ADMIN');
      } catch (e) {
        // Invalid stored data, clear it
        localStorage.removeItem(AUTH_TOKEN_KEY);
        localStorage.removeItem('iex_user');
      }
    }
    
    setAuthLoading(false);
  }, []);

  // Global logout listener from Axios 401 interceptor
  useEffect(() => {
    const handleLogout = () => logout();
    authEventEmitter.addEventListener('logout', handleLogout);
    return () => authEventEmitter.removeEventListener('logout', handleLogout);
  }, []);

  const login = (newToken: string, newUser: AppUser) => {
    setToken(newToken);
    setUser(newUser);
    setIsAuthenticated(true);
    setIsAdmin(newUser.role === 'ADMIN' || newUser.role === 'SUPER_ADMIN');
    setIsSuperAdmin(newUser.role === 'SUPER_ADMIN');
    localStorage.setItem(AUTH_TOKEN_KEY, newToken);
    localStorage.setItem('iex_user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    setIsSuperAdmin(false);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem('iex_user');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAdmin, isSuperAdmin, token, user, authLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

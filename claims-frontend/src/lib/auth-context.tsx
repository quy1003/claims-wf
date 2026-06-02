'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

interface AuthContextValue {
  token: string | null;
  role: string | null;
  userId: string | null;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue>({
  token: null, role: null, userId: null, username: null,
  login: async () => {}, logout: () => {}, isLoading: true, error: null,
});

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
const TOKEN_KEY = 'cfw_token';
const USER_KEY  = 'cfw_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken]     = useState<string | null>(null);
  const [role, setRole]       = useState<string | null>(null);
  const [userId, setUserId]   = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Restore from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser  = localStorage.getItem(USER_KEY);
    if (savedToken && savedUser) {
      try {
        const u = JSON.parse(savedUser);
        setToken(savedToken);
        setRole(u.role);
        setUserId(u.userId);
        setUsername(u.username);
      } catch { /* ignore */ }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (uname: string, password: string) => {
    setError(null);
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: uname, password }),
    });

    if (!res.ok) {
      const body = await res.json();
      throw new Error(body.message ?? 'Login failed');
    }

    const json = await res.json();
    // Response may be wrapped in ApiResponse envelope
    const accessToken: string = json.data?.accessToken ?? json.accessToken;

    // Decode JWT payload (base64)
    const [, payloadB64] = accessToken.split('.');
    const payload = JSON.parse(atob(payloadB64));

    const userMeta = { role: payload.role, userId: payload.sub, username: payload.username ?? uname };
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userMeta));

    setToken(accessToken);
    setRole(userMeta.role);
    setUserId(userMeta.userId);
    setUsername(userMeta.username);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null); setRole(null); setUserId(null); setUsername(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, role, userId, username, login, logout, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

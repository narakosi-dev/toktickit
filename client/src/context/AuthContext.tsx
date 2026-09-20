import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { AuthUser, loginUser, logoutUser, getMe, changePassword as apiChangePassword } from "../api.js";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "toktickit_auth_token";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(!!localStorage.getItem(TOKEN_KEY));

  // On mount, if token exists, validate it
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (storedToken) {
      getMe(storedToken)
        .then(({ user: profile }) => {
          setUser(profile);
          setToken(storedToken);
        })
        .catch(() => {
          // Token invalid or expired — clear state
          localStorage.removeItem(TOKEN_KEY);
          setToken(null);
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await loginUser(email, password);
    localStorage.setItem(TOKEN_KEY, response.token);
    setToken(response.token);
    setUser(response.user);
  }, []);

  const logout = useCallback(() => {
    logoutUser().catch(() => {}); // fire and forget
    localStorage.removeItem(TOKEN_KEY);
    // Also clear old requester context
    localStorage.removeItem("toktickit_selected_requester");
    setToken(null);
    setUser(null);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    if (!token) throw new Error("Not authenticated");
    const response = await apiChangePassword(token, currentPassword, newPassword);
    localStorage.setItem(TOKEN_KEY, response.token);
    setToken(response.token);
    setUser(response.user);
  }, [token]);

  const refreshProfile = useCallback(async () => {
    if (!token) return;
    const { user: profile } = await getMe(token);
    setUser(profile);
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, changePassword, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

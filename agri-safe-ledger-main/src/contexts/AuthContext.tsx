
import React, { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { loginAPI, getMeAPI, getToken, setToken, removeToken } from "@/lib/api";

export interface User {
  id: string;
  name: string;
  role: "farmer" | "veterinarian" | "admin";
}

interface AuthContextType {
  user: User | null;
  login: (userId: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // App start ஆகும்போது token இருந்தா user restore பண்றது
  useEffect(() => {
    const restore = async () => {
      if (getToken()) {
        try {
          const me = await getMeAPI();
          setUser(me);
        } catch {
          removeToken(); // Token expired
        }
      }
      setIsLoading(false);
    };
    restore();
  }, []);

  const login = async (userId: string, password: string): Promise<boolean> => {
    try {
      const { token, user: userData } = await loginAPI(userId, password);
      setToken(token);
      setUser(userData);
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    removeToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

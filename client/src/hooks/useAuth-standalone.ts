/**
 * Hook de autenticação standalone (sem OAuth Manus)
 */

import { useState, useEffect } from "react";

export interface User {
  id: number;
  openId: string;
  email: string | null;
  name: string | null;
  loginMethod: string | null;
  role: "admin" | "user";
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
}

export function useAuthStandalone() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("[Auth] Check error:", err);
      setError("Erro ao verificar autenticação");
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(pin: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ pin }),
      });

      if (response.ok) {
        const data = await response.json();
        await checkAuth(); // Recarregar usuário
        return { success: true };
      } else {
        const data = await response.json();
        return { success: false, error: data.error || "PIN inválido" };
      }
    } catch (err) {
      console.error("[Auth] Login error:", err);
      return { success: false, error: "Erro ao fazer login" };
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
    } catch (err) {
      console.error("[Auth] Logout error:", err);
    }
  }

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    logout,
  };
}

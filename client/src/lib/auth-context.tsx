import { createContext, useContext, useEffect, useState } from "react";
import { User } from "./api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
  refreshBalance: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const userData = localStorage.getItem("auth_user");
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser({
          ...parsedUser,
          token,
          balance: parsedUser.balance ?? 0,
          role: parsedUser.role ?? "user",
        });
      } catch {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem("auth_token", newUser.token);
    localStorage.setItem(
      "auth_user",
      JSON.stringify({
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        balance: newUser.balance,
        role: newUser.role,
      }),
    );
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
  };

  const refreshBalance = async () => {
  try {
    const token = localStorage.getItem("auth_token");
    if (!token || !user) return;

    const response = await fetch("http://localhost:4001/api/users/profile?activePage=1&resolvedPage=1", {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (data.balance !== undefined) {
      const updatedUser = { ...user, balance: data.balance };
      setUser(updatedUser);
      localStorage.setItem(
        "auth_user",
        JSON.stringify({
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          balance: updatedUser.balance,
          role: updatedUser.role,
        }),
      );
    }
  } catch {
    // silently fail
  }
};

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isAuthenticated: !!user,
        refreshBalance,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
import React, { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, User } from "@workspace/api-client-react";
import { useLocation } from "wouter";

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("realona_token"));
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  const { data: fetchedUser, isLoading: isFetchingUser, isError } = useGetMe({
    query: {
      queryKey: ["getMe", token],
      enabled: !!token,
      retry: false,
    }
  });

  useEffect(() => {
    if (token) {
      if (!isFetchingUser) {
        if (fetchedUser) {
          setUser(fetchedUser);
          setIsLoading(false);
        } else if (isError) {
          localStorage.removeItem("realona_token");
          setToken(null);
          setUser(null);
          setIsLoading(false);
        }
      }
    } else {
      setIsLoading(false);
    }
  }, [token, fetchedUser, isFetchingUser, isError]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("realona_token", newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("realona_token");
    setToken(null);
    setUser(null);
    setLocation("/login");
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

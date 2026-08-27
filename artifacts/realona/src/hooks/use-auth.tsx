import React, { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, User } from "@workspace/api-client-react";
import { useLocation } from "wouter";

type AuthContextType = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isUnavailable: boolean;
  retryAuth: () => void;
  login: (token: string, user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("realona_token"));
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [, setLocation] = useLocation();

  const { data: fetchedUser, isLoading: isFetchingUser, isError, error, refetch } = useGetMe({
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
          setIsUnavailable(false);
          setIsLoading(false);
        } else if ((error as any)?.response?.status === 401 || (error as any)?.response?.status === 403) {
          localStorage.removeItem("realona_token");
          setToken(null);
          setUser(null);
          setIsLoading(false);
        } else if (isError) {
          setIsUnavailable(true);
          setIsLoading(false);
        }
      }
    } else {
      setIsLoading(false);
    }
  }, [token, fetchedUser, isFetchingUser, isError, error]);

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
    <AuthContext.Provider value={{ user, token, isLoading, isUnavailable, retryAuth: () => { setIsLoading(true); void refetch(); }, login, logout }}>
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

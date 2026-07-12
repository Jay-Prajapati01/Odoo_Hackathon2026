import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { User } from "../types";
import { authApi } from "../services/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchRole: (role: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Core User list matching server seeding for fast sandbox switching
const demoUsers: Partial<User>[] = [
  {
    id: "u-1",
    email: "admin@assetflow.com",
    firstName: "Alex",
    lastName: "Carter",
    role: "Admin",
    department: "Executive",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
  },
  {
    id: "u-2",
    email: "manager@assetflow.com",
    firstName: "Jane",
    lastName: "Doe",
    role: "Asset Manager",
    department: "Operations",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
  },
  {
    id: "u-3",
    email: "depthead@assetflow.com",
    firstName: "Priya",
    lastName: "Shah",
    role: "Department Head",
    department: "Engineering",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
  },
  {
    id: "u-4",
    email: "employee@assetflow.com",
    firstName: "Sarah",
    lastName: "Jenkins",
    role: "Employee",
    department: "Engineering",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&q=80",
  },
];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    const savedToken = localStorage.getItem("assetflow_access_token");
    const savedUser = localStorage.getItem("assetflow_user");
    const savedRole = localStorage.getItem("assetflow_role");
    const savedPerms = localStorage.getItem("assetflow_permissions");

    if (savedToken) {
      setToken(savedToken);
      if (savedUser) setUser(JSON.parse(savedUser));
      if (savedRole) setRole(savedRole);
      if (savedPerms) setPermissions(JSON.parse(savedPerms));

      try {
        const data = await authApi.me();
        setUser(data.user);
        const roleName = typeof data.role === "string" ? data.role : ((data.role as any)?.roleName || "");
        setRole(roleName);
        setPermissions(data.permissions || []);
        localStorage.setItem("assetflow_user", JSON.stringify(data.user));
        localStorage.setItem("assetflow_role", roleName);
        localStorage.setItem("assetflow_permissions", JSON.stringify(data.permissions || []));
      } catch {
        // Fallback: If it's a dummy token from demo role switching, don't clear it instantly if offline/demo
        if (savedToken.includes("dummy")) {
          setIsLoading(false);
          return;
        }
        localStorage.removeItem("assetflow_access_token");
        localStorage.removeItem("assetflow_refresh_token");
        localStorage.removeItem("assetflow_user");
        localStorage.removeItem("assetflow_role");
        localStorage.removeItem("assetflow_permissions");
        setToken(null);
        setUser(null);
        setRole(null);
        setPermissions([]);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await authApi.login({ email, password });
      setToken(data.accessToken);
      setUser(data.user);
      const roleName = typeof data.role === "string" ? data.role : ((data.role as any)?.roleName || "");
      setRole(roleName);
      setPermissions(data.permissions || []);
      localStorage.setItem("assetflow_access_token", data.accessToken);
      localStorage.setItem("assetflow_refresh_token", data.refreshToken);
      localStorage.setItem("assetflow_user", JSON.stringify(data.user));
      localStorage.setItem("assetflow_role", roleName);
      localStorage.setItem("assetflow_permissions", JSON.stringify(data.permissions || []));
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    setToken(null);
    setUser(null);
    setRole(null);
    setPermissions([]);
    localStorage.removeItem("assetflow_access_token");
    localStorage.removeItem("assetflow_refresh_token");
    localStorage.removeItem("assetflow_user");
    localStorage.removeItem("assetflow_role");
    localStorage.removeItem("assetflow_permissions");
  };

  // Demo role-switcher bypass helper for sandbox presentations
  const switchRole = (newRole: string) => {
    const found = demoUsers.find((u) => u.role === newRole);
    if (found) {
      const updatedUser = {
        ...user,
        ...found,
        // Make sure it matches User type
        status: "active" as const,
        isEmailVerified: true,
        createdAt: user?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as User;

      setUser(updatedUser);
      setRole(newRole);
      
      const dummyToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_access_token";
      setToken(dummyToken);
      localStorage.setItem("assetflow_access_token", dummyToken);
      localStorage.setItem("assetflow_user", JSON.stringify(updatedUser));
      localStorage.setItem("assetflow_role", newRole);
      // Dummy permissions matching roles
      const dummyPerms = newRole === "Admin" 
        ? ["admin", "read", "write"] 
        : newRole === "Asset Manager" 
        ? ["manager", "read", "write"] 
        : ["read"];
      setPermissions(dummyPerms);
      localStorage.setItem("assetflow_permissions", JSON.stringify(dummyPerms));
    }
  };

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider value={{ user, token, role, permissions, isAuthenticated, isLoading, login, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

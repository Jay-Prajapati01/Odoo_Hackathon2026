import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<"Admin" | "Asset Manager" | "Department Head" | "Employee">;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-gray">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 rounded-full border-primary border-t-transparent animate-spin"></div>
          <span className="text-sm font-medium text-gray-500">Loading AssetFlow ERP...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login while saving the attempted location
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role as "Admin" | "Asset Manager" | "Department Head" | "Employee")) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};

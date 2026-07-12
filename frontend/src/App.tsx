import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import { AppProvider } from "./contexts/AppContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Layout } from "./components/Layout";

// PAGE IMPORTS
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Organization } from "./pages/Organization";
import { Assets } from "./pages/Assets";
import { Allocation } from "./pages/Allocation";
import { Booking } from "./pages/Booking";
import { Maintenance } from "./pages/Maintenance";
import { Audit } from "./pages/Audit";
import { Reports } from "./pages/Reports";
import { Notifications } from "./pages/Notifications";
import { Settings } from "./pages/Settings";
import { Support } from "./pages/Support";
import { Forbidden } from "./pages/Forbidden";
import { NotFound } from "./pages/NotFound";

// Initialize TanStack React Query Client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevent distracting refetches during sandbox demo
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppProvider>
          <BrowserRouter>
            <Routes>
              {/* AUTH PANEL */}
              <Route path="/" element={<Login />} />

              {/* ERP ENCLAVE ROUTES (PROTECTED + DYNAMIC SIDEBAR LAYOUT) */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/organization"
                element={
                  <ProtectedRoute allowedRoles={["Admin"]}>
                    <Layout>
                      <Organization />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/assets"
                element={
                  <ProtectedRoute allowedRoles={["Admin", "Asset Manager"]}>
                    <Layout>
                      <Assets />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/allocation"
                element={
                  <ProtectedRoute allowedRoles={["Admin", "Asset Manager", "Department Head"]}>
                    <Layout>
                      <Allocation />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/booking"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Booking />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/maintenance"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Maintenance />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/audit"
                element={
                  <ProtectedRoute allowedRoles={["Admin", "Asset Manager"]}>
                    <Layout>
                      <Audit />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedRoute allowedRoles={["Admin", "Asset Manager", "Department Head"]}>
                    <Layout>
                      <Reports />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Notifications />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute allowedRoles={["Admin", "Asset Manager", "Department Head"]}>
                    <Layout>
                      <Settings />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/support"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Support />
                    </Layout>
                  </ProtectedRoute>
                }
              />

              {/* SECURITY EXCEPTION BOUNDARIES */}
              <Route path="/403" element={<Forbidden />} />
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

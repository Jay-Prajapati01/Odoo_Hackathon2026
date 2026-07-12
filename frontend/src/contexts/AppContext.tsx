import React, { createContext, useContext, useState, ReactNode } from "react";

interface AppContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
  settings: {
    notificationsEnabled: boolean;
    autoAuditEnabled: boolean;
    maintenanceNotifications: boolean;
  };
  updateSettings: (key: string, value: boolean) => void;
  notificationBadgeCount: number;
  setNotificationBadgeCount: (count: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [notificationBadgeCount, setNotificationBadgeCount] = useState(2); // Starts with 2 unread notifications
  const [settings, setSettings] = useState({
    notificationsEnabled: true,
    autoAuditEnabled: false,
    maintenanceNotifications: true,
  });

  const updateSettings = (key: string, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <AppContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        theme,
        setTheme,
        settings,
        updateSettings,
        notificationBadgeCount,
        setNotificationBadgeCount,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};

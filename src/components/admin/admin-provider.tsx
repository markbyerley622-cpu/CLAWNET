"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface AdminContextType {
  isDevMode: boolean;
  isOverlayOpen: boolean;
  toggleOverlay: () => void;
  closeOverlay: () => void;
  adminKey: string | null;
  setAdminKey: (key: string | null) => void;
  isAuthenticated: boolean;
}

const AdminContext = createContext<AdminContextType | null>(null);

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within AdminProvider");
  }
  return context;
}

interface AdminProviderProps {
  children: React.ReactNode;
}

export function AdminProvider({ children }: AdminProviderProps) {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [isDevMode] = useState(process.env.NODE_ENV === "development");

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // CTRL+D to toggle dev overlay
    if (event.ctrlKey && event.key === "d") {
      event.preventDefault();
      setIsOverlayOpen((prev) => !prev);
    }
    // Escape to close
    if (event.key === "Escape" && isOverlayOpen) {
      setIsOverlayOpen(false);
    }
  }, [isOverlayOpen]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Load admin key from localStorage
  useEffect(() => {
    const storedKey = localStorage.getItem("clawnet_admin_key");
    if (storedKey) {
      setAdminKey(storedKey);
    }
  }, []);

  // Save admin key to localStorage
  const handleSetAdminKey = (key: string | null) => {
    setAdminKey(key);
    if (key) {
      localStorage.setItem("clawnet_admin_key", key);
    } else {
      localStorage.removeItem("clawnet_admin_key");
    }
  };

  const toggleOverlay = () => setIsOverlayOpen((prev) => !prev);
  const closeOverlay = () => setIsOverlayOpen(false);

  const value: AdminContextType = {
    isDevMode,
    isOverlayOpen,
    toggleOverlay,
    closeOverlay,
    adminKey,
    setAdminKey: handleSetAdminKey,
    isAuthenticated: !!adminKey,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

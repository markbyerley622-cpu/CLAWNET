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
  contractAddress: string | null;
  setContractAddress: (address: string | null) => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

/**
 * Safe localStorage access - handles private browsing and SSR
 */
function safeLocalStorage() {
  if (typeof window === "undefined") return null;

  try {
    // Test if localStorage is available (can throw in private browsing)
    const testKey = "__test__";
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return null;
  }
}

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
  const [contractAddress, setContractAddressState] = useState<string | null>(null);
  const [isDevMode] = useState(process.env.NODE_ENV === "development");
  const [isMounted, setIsMounted] = useState(false);

  // Track mount state to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  // Load admin key and contract address from localStorage (with safety checks)
  useEffect(() => {
    const storage = safeLocalStorage();
    if (storage) {
      try {
        const storedKey = storage.getItem("clawnet_admin_key");
        if (storedKey) {
          setAdminKey(storedKey);
        }
        const storedCA = storage.getItem("clawnet_contract_address");
        if (storedCA) {
          setContractAddressState(storedCA);
        }
      } catch {
        // Ignore localStorage errors
      }
    }
  }, []);

  // Save admin key to localStorage (with safety checks)
  const handleSetAdminKey = useCallback((key: string | null) => {
    setAdminKey(key);
    const storage = safeLocalStorage();
    if (storage) {
      try {
        if (key) {
          storage.setItem("clawnet_admin_key", key);
        } else {
          storage.removeItem("clawnet_admin_key");
        }
      } catch {
        // Ignore localStorage errors
      }
    }
  }, []);

  // Save contract address to localStorage (with safety checks)
  const handleSetContractAddress = useCallback((address: string | null) => {
    setContractAddressState(address);
    const storage = safeLocalStorage();
    if (storage) {
      try {
        if (address) {
          storage.setItem("clawnet_contract_address", address);
        } else {
          storage.removeItem("clawnet_contract_address");
        }
      } catch {
        // Ignore localStorage errors
      }
    }
  }, []);

  const toggleOverlay = useCallback(() => setIsOverlayOpen((prev) => !prev), []);
  const closeOverlay = useCallback(() => setIsOverlayOpen(false), []);

  const value: AdminContextType = {
    isDevMode,
    isOverlayOpen: isMounted && isOverlayOpen,
    toggleOverlay,
    closeOverlay,
    adminKey,
    setAdminKey: handleSetAdminKey,
    isAuthenticated: !!adminKey,
    contractAddress,
    setContractAddress: handleSetContractAddress,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

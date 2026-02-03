"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

interface AdminContextType {
  isDevMode: boolean;
  isOverlayOpen: boolean;
  toggleOverlay: () => void;
  closeOverlay: () => void;
  adminKey: string | null;
  setAdminKey: (key: string | null) => void;
  isAuthenticated: boolean;
  contractAddress: string | null;
  setContractAddress: (address: string | null) => Promise<void>;
  isCALoading: boolean;
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

// Polling interval for CA updates (5 seconds)
const CA_POLL_INTERVAL = 5000;

export function AdminProvider({ children }: AdminProviderProps) {
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [contractAddress, setContractAddressState] = useState<string | null>(null);
  const [isCALoading, setIsCALoading] = useState(false);
  const [isDevMode] = useState(process.env.NODE_ENV === "development");
  const [isMounted, setIsMounted] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

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

  // Fetch contract address from API
  const fetchContractAddress = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await fetch("/api/settings", { signal });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setContractAddressState(data.data.contractAddress || null);
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      // Silently fail - will retry on next poll
    }
  }, []);

  // Poll for CA updates from server (real-time sync across all clients)
  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Initial fetch
    fetchContractAddress(controller.signal);

    // Poll for updates
    const interval = setInterval(() => {
      fetchContractAddress(controller.signal);
    }, CA_POLL_INTERVAL);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [fetchContractAddress]);

  // Load admin key from localStorage (with safety checks)
  useEffect(() => {
    const storage = safeLocalStorage();
    if (storage) {
      try {
        const storedKey = storage.getItem("clawnet_admin_key");
        if (storedKey) {
          setAdminKey(storedKey);
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

  // Save contract address to server (global sync)
  const handleSetContractAddress = useCallback(async (address: string | null) => {
    setIsCALoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractAddress: address }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setContractAddressState(data.data.contractAddress || null);
        }
      }
    } catch (err) {
      console.error("Failed to update contract address:", err);
    } finally {
      setIsCALoading(false);
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
    isCALoading,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

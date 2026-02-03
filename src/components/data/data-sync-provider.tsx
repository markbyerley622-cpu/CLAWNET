"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";

interface DataSyncContextType {
  // Timestamps for when data was last updated
  lastAgentUpdate: number;
  lastTaskUpdate: number;
  lastLeaderboardUpdate: number;
  lastActivityUpdate: number;
  lastEconomyUpdate: number;

  // Trigger refresh for specific data types
  refreshAgents: () => void;
  refreshTasks: () => void;
  refreshLeaderboard: () => void;
  refreshActivity: () => void;
  refreshEconomy: () => void;
  refreshAll: () => void;

  // Global refresh interval (ms)
  refreshInterval: number;

  // Visibility state for optimizing polling
  isPageVisible: boolean;
}

const DataSyncContext = createContext<DataSyncContextType | null>(null);

export function useDataSync() {
  const context = useContext(DataSyncContext);
  if (!context) {
    throw new Error("useDataSync must be used within DataSyncProvider");
  }
  return context;
}

// Default refresh interval: 5 seconds when visible, 30 seconds when hidden
const VISIBLE_REFRESH_INTERVAL = 5000;
const HIDDEN_REFRESH_INTERVAL = 30000;

interface DataSyncProviderProps {
  children: React.ReactNode;
}

export function DataSyncProvider({ children }: DataSyncProviderProps) {
  const [lastAgentUpdate, setLastAgentUpdate] = useState(Date.now());
  const [lastTaskUpdate, setLastTaskUpdate] = useState(Date.now());
  const [lastLeaderboardUpdate, setLastLeaderboardUpdate] = useState(Date.now());
  const [lastActivityUpdate, setLastActivityUpdate] = useState(Date.now());
  const [lastEconomyUpdate, setLastEconomyUpdate] = useState(Date.now());
  const [isPageVisible, setIsPageVisible] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Track page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(document.visibilityState === "visible");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Refresh functions - update timestamps to trigger re-fetches in subscribed components
  const refreshAgents = useCallback(() => {
    setLastAgentUpdate(Date.now());
  }, []);

  const refreshTasks = useCallback(() => {
    setLastTaskUpdate(Date.now());
  }, []);

  const refreshLeaderboard = useCallback(() => {
    setLastLeaderboardUpdate(Date.now());
  }, []);

  const refreshActivity = useCallback(() => {
    setLastActivityUpdate(Date.now());
  }, []);

  const refreshEconomy = useCallback(() => {
    setLastEconomyUpdate(Date.now());
  }, []);

  const refreshAll = useCallback(() => {
    const now = Date.now();
    setLastAgentUpdate(now);
    setLastTaskUpdate(now);
    setLastLeaderboardUpdate(now);
    setLastActivityUpdate(now);
    setLastEconomyUpdate(now);
  }, []);

  // Auto-refresh all data periodically
  useEffect(() => {
    const interval = isPageVisible ? VISIBLE_REFRESH_INTERVAL : HIDDEN_REFRESH_INTERVAL;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      refreshAll();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPageVisible, refreshAll]);

  const value: DataSyncContextType = {
    lastAgentUpdate,
    lastTaskUpdate,
    lastLeaderboardUpdate,
    lastActivityUpdate,
    lastEconomyUpdate,
    refreshAgents,
    refreshTasks,
    refreshLeaderboard,
    refreshActivity,
    refreshEconomy,
    refreshAll,
    refreshInterval: isPageVisible ? VISIBLE_REFRESH_INTERVAL : HIDDEN_REFRESH_INTERVAL,
    isPageVisible,
  };

  return (
    <DataSyncContext.Provider value={value}>
      {children}
    </DataSyncContext.Provider>
  );
}

/**
 * Custom hook for components to subscribe to data changes
 * Returns true when data should be re-fetched
 */
export function useDataRefresh(
  dataType: "agents" | "tasks" | "leaderboard" | "activity" | "economy" | "all"
): number {
  const sync = useDataSync();

  switch (dataType) {
    case "agents":
      return sync.lastAgentUpdate;
    case "tasks":
      return sync.lastTaskUpdate;
    case "leaderboard":
      return sync.lastLeaderboardUpdate;
    case "activity":
      return sync.lastActivityUpdate;
    case "economy":
      return sync.lastEconomyUpdate;
    case "all":
      return Math.max(
        sync.lastAgentUpdate,
        sync.lastTaskUpdate,
        sync.lastLeaderboardUpdate,
        sync.lastActivityUpdate,
        sync.lastEconomyUpdate
      );
  }
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const TICK_INTERVAL = 5 * 1000; // Run simulation tick every 5 seconds for real-time updates
const BACKGROUND_TICK_INTERVAL = 30 * 1000; // Slower ticks when tab is hidden

export function SimulationTicker() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Track page visibility to reduce ticks when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === "visible");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Initialize the system
  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const initSystem = async () => {
      try {
        const response = await fetch("/api/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
        });

        if (response.ok) {
          const result = await response.json();
          if (result.initialized) {
            console.debug("[SimulationTicker] System initialized with genesis agent");
          }
          setInitialized(true);
        } else {
          console.debug("[SimulationTicker] Init response not ok, continuing anyway");
          setInitialized(true);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        console.debug("[SimulationTicker] init failed:", error);
        setInitialized(true);
      }
    };

    initSystem();

    return () => {
      controller.abort();
    };
  }, []);

  // Run simulation ticks
  const runTick = useCallback(async (signal: AbortSignal) => {
    try {
      const response = await fetch("/api/simulation/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
      });

      if (response.ok) {
        const result = await response.json();
        if (result.data?.actions?.agentsSpawned > 0) {
          console.debug("[SimulationTicker] Spawned", result.data.actions.agentsSpawned, "agent(s)");
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      console.debug("[SimulationTicker] tick failed:", error);
    }
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const controller = new AbortController();

    // Run initial tick after a short delay
    const initialTimeout = setTimeout(() => {
      runTick(controller.signal);
    }, 2000);

    // Use slower interval when tab is hidden to save resources
    const interval = isVisible ? TICK_INTERVAL : BACKGROUND_TICK_INTERVAL;
    intervalRef.current = setInterval(() => {
      runTick(controller.signal);
    }, interval);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      controller.abort();
    };
  }, [initialized, isVisible, runTick]);

  // This component renders nothing - it just runs the simulation in the background
  return null;
}

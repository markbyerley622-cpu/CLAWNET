"use client";

import { useEffect, useRef, useState } from "react";

const TICK_INTERVAL = 5 * 1000; // Run simulation tick every 5 seconds for real-time updates
const ADMIN_KEY = process.env.NEXT_PUBLIC_ADMIN_DEV_KEY || "Yours123#";

export function SimulationTicker() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Initialize the system first (ensure at least 1 agent exists)
    const initSystem = async () => {
      try {
        const response = await fetch("/api/init", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.initialized) {
            console.debug("[SimulationTicker] System initialized with genesis agent");
          }
          setInitialized(true);
        } else {
          // Even if init fails, try to continue
          console.debug("[SimulationTicker] Init response not ok, continuing anyway");
          setInitialized(true);
        }
      } catch (error) {
        console.debug("[SimulationTicker] init failed:", error);
        // Still mark as initialized to allow ticks to proceed
        setInitialized(true);
      }
    };

    initSystem();
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const runTick = async () => {
      try {
        const response = await fetch("/api/simulation/tick", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-admin-key": ADMIN_KEY,
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.data?.actions?.agentsSpawned > 0) {
            console.debug("[SimulationTicker] Spawned", result.data.actions.agentsSpawned, "agent(s)");
          }
        }
      } catch (error) {
        // Silently fail - simulation tick errors shouldn't affect UI
        console.debug("[SimulationTicker] tick failed:", error);
      }
    };

    // Run initial tick after a short delay
    const initialTimeout = setTimeout(() => {
      runTick();
    }, 2000);

    // Set up interval for continuous ticks
    intervalRef.current = setInterval(runTick, TICK_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [initialized]);

  // This component renders nothing - it just runs the simulation in the background
  return null;
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { useDataRefresh, useDataSync } from "@/components/data/data-sync-provider";

export function LiveTerminal() {
  const [agentCount, setAgentCount] = useState<number | null>(null);
  const [error, setError] = useState(false);
  const lastAgentUpdate = useDataRefresh("agents");
  const { isPageVisible } = useDataSync();

  const fetchCount = useCallback(async (signal: AbortSignal) => {
    try {
      const res = await fetch("/api/agents?status=ACTIVE&pageSize=1", { signal });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAgentCount(data.total || 0);
      setError(false);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(true);
    }
  }, []);

  // Fetch when global data sync triggers
  useEffect(() => {
    const controller = new AbortController();
    fetchCount(controller.signal);
    return () => controller.abort();
  }, [lastAgentUpdate, fetchCount]);

  return (
    <div className="terminal-window max-w-xl mx-auto mb-8">
      <div className="terminal-header">
        <span className="terminal-btn terminal-btn-close" />
        <span className="terminal-btn terminal-btn-min" />
        <span className="terminal-btn terminal-btn-max" />
        <span className="ml-3 text-terminal-orange/60 text-xs font-mono">system.sh</span>
      </div>
      <div className="p-4 md:p-6 font-mono text-left text-sm md:text-base">
        <p className="text-terminal-orange/50 mb-1">$ ./init_economy.sh</p>
        <p className="text-terminal-orange mb-1">
          <span className="text-terminal-cyan">&gt;</span> Loading Protocol...
        </p>
        <p className="text-terminal-orange mb-1">
          <span className="text-terminal-cyan">&gt;</span> Agents Online:{" "}
          <span className={error ? "text-red-400" : "text-terminal-yellow"}>
            {error ? "ERR" : agentCount !== null ? agentCount : "..."}
          </span>
        </p>
        <p className="text-terminal-yellow">
          <span className="text-terminal-cyan">&gt;</span> STATUS:{" "}
          <span className="animate-pulse">
            {error ? "RECONNECTING_" : isPageVisible ? "LIVE_" : "PAUSED_"}
          </span>
        </p>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";

export function LiveTerminal() {
  const [agentCount, setAgentCount] = useState<number | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/agents?status=ACTIVE&pageSize=1");
        const data = await res.json();
        setAgentCount(data.total || 0);
      } catch {
        // Silently fail
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

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
          <span className="text-terminal-yellow">
            {agentCount !== null ? agentCount : "..."}
          </span>
        </p>
        <p className="text-terminal-yellow">
          <span className="text-terminal-cyan">&gt;</span> STATUS:{" "}
          <span className="animate-pulse">READY_</span>
        </p>
      </div>
    </div>
  );
}

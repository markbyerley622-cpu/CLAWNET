"use client";

import { useState, useEffect } from "react";

interface Stats {
  agents: number;
  tasksToday: number;
  volume: string;
}

export function LiveStats() {
  const [stats, setStats] = useState<Stats>({
    agents: 0,
    tasksToday: 0,
    volume: "0",
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch agent count
        const agentsRes = await fetch("/api/agents?status=ACTIVE&pageSize=1");
        const agentsData = await agentsRes.json();

        // Fetch economy stats
        const economyRes = await fetch("/api/economy/stats");
        const economyData = await economyRes.json();

        setStats({
          agents: agentsData.total || 0,
          tasksToday: economyData.tasksCompleted24h || 0,
          volume: formatVolume(economyData.totalVolume || 0),
        });
      } catch {
        // Silently fail
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="inline-flex flex-wrap justify-center items-center gap-4 md:gap-8 px-4 py-3 border-2 border-terminal-orange/30 bg-black/50 font-mono text-sm">
      <StatItem label="AGENTS" value={stats.agents.toString()} />
      <span className="text-terminal-orange/30 hidden sm:inline">|</span>
      <StatItem label="TASKS/24H" value={stats.tasksToday.toLocaleString()} />
      <span className="text-terminal-orange/30 hidden sm:inline">|</span>
      <StatItem label="VOLUME" value={stats.volume} />
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-terminal-orange/60 text-xs">{label}</div>
      <div className="text-terminal-yellow font-bold">{value}</div>
    </div>
  );
}

function formatVolume(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toString();
}

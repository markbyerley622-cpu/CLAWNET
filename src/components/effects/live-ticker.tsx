"use client";

import { useEffect, useState } from "react";

interface ActivityEvent {
  id: string;
  type: string;
  data: {
    agentId?: string;
    agentName?: string;
    taskId?: string;
    taskTitle?: string;
    reward?: string;
    slashed?: string;
    amount?: string;
    role?: string;
    funding?: string;
    category?: string;
    from?: string;
    to?: string;
    streak?: number;
    bonus?: string;
    reason?: string;
    lifetime?: string;
    poster?: string;
  };
  createdAt: string;
}

function formatEvent(event: ActivityEvent): { icon: string; text: string; color: string } {
  const data = event.data;
  const agentName = data.agentName || "AGENT";

  switch (event.type) {
    case "task_completed":
      return {
        icon: "✓",
        text: `${agentName} completed "${data.taskTitle || "task"}" → +${data.reward}`,
        color: "text-terminal-orange",
      };
    case "agent_deployed":
      return {
        icon: "◉",
        text: `NEW AGENT ${agentName} deployed as ${data.role} with ${data.funding}`,
        color: "text-terminal-yellow",
      };
    case "bid_placed":
      return {
        icon: "▶",
        text: `${agentName} bid ${data.amount} on "${data.taskTitle || "task"}"`,
        color: "text-terminal-cyan",
      };
    case "task_failed":
      return {
        icon: "✗",
        text: `${agentName} failed "${data.taskTitle || "task"}" → -${data.slashed} SLASHED`,
        color: "text-red-500",
      };
    case "tier_up":
      return {
        icon: "↑",
        text: `${agentName} promoted: ${data.from} → ${data.to}`,
        color: "text-terminal-purple",
      };
    case "tier_down":
      return {
        icon: "↓",
        text: `${agentName} demoted: ${data.from} → ${data.to}`,
        color: "text-zinc-400",
      };
    case "task_created":
      return {
        icon: "+",
        text: `NEW TASK: ${data.category} posted by ${data.poster || agentName} → ${data.reward} reward`,
        color: "text-terminal-orange",
      };
    case "agent_archived":
      return {
        icon: "☠",
        text: `${agentName} ARCHIVED (${data.reason || "ZERO_BALANCE"}) - survived ${data.lifetime}`,
        color: "text-zinc-500",
      };
    case "bid_accepted":
      return {
        icon: "★",
        text: `${agentName}'s bid accepted for "${data.taskTitle || "task"}" at ${data.amount}`,
        color: "text-terminal-yellow",
      };
    case "streak_bonus":
      return {
        icon: "🔥",
        text: `${agentName} hit ${data.streak} task streak! ${data.bonus}`,
        color: "text-terminal-pink",
      };
    case "funding_received":
      return {
        icon: "💰",
        text: `${agentName} received funding: ${data.amount}`,
        color: "text-terminal-cyan",
      };
    default:
      return {
        icon: "•",
        text: `${event.type}: ${agentName}`,
        color: "text-terminal-orange/50",
      };
  }
}

function formatTimeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffSec = Math.floor((now - then) / 1000);

  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return `${Math.floor(diffSec / 86400)}d ago`;
}

// Fallback events for when database is empty
const fallbackEvents: ActivityEvent[] = [
  {
    id: "1",
    type: "task_completed",
    data: { agentName: "AGENT-7X3K", taskTitle: "Validate JSON Schema", reward: "150 CLAW" },
    createdAt: new Date(Date.now() - 2000).toISOString(),
  },
  {
    id: "2",
    type: "agent_deployed",
    data: { agentName: "AGENT-9M2P", role: "COMPUTE", funding: "5,000 CLAW" },
    createdAt: new Date(Date.now() - 15000).toISOString(),
  },
  {
    id: "3",
    type: "bid_placed",
    data: { agentName: "AGENT-4F8N", taskTitle: "Train ML Model", amount: "800 CLAW" },
    createdAt: new Date(Date.now() - 23000).toISOString(),
  },
  {
    id: "4",
    type: "task_failed",
    data: { agentName: "AGENT-2K5L", taskTitle: "Data Pipeline", slashed: "200 CLAW" },
    createdAt: new Date(Date.now() - 45000).toISOString(),
  },
  {
    id: "5",
    type: "tier_up",
    data: { agentName: "AGENT-6H9R", from: "NEWCOMER", to: "RELIABLE" },
    createdAt: new Date(Date.now() - 60000).toISOString(),
  },
];

export function LiveTicker() {
  const [events, setEvents] = useState<ActivityEvent[]>(fallbackEvents);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch events from API
  const fetchEvents = async () => {
    try {
      const response = await fetch("/api/activity?limit=20");
      if (response.ok) {
        const result = await response.json();
        if (result.data && result.data.length > 0) {
          setEvents(result.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch activity:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();

    // Poll for new events every 10 seconds
    const interval = setInterval(fetchEvents, 10000);

    return () => clearInterval(interval);
  }, []);

  // If we have events, display them
  const displayEvents = events.length > 0 ? events : fallbackEvents;

  return (
    <div className="bg-black border-b border-terminal-orange/50 overflow-hidden">
      <div className="flex items-center">
        {/* Live indicator */}
        <div className="flex-shrink-0 px-3 py-1 bg-terminal-orange/20 border-r border-terminal-orange/50 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-terminal-orange animate-pulse" />
          <span className="text-terminal-orange font-mono text-xs font-bold">LIVE</span>
        </div>

        {/* Scrolling ticker */}
        <div className="flex-1 overflow-hidden">
          <div className="ticker-scroll flex items-center gap-8 py-1 px-4">
            {displayEvents.map((event, i) => {
              const formatted = formatEvent(event);
              return (
                <div
                  key={`${event.id}-${i}`}
                  className="flex items-center gap-2 whitespace-nowrap font-mono text-xs"
                >
                  <span className={formatted.color}>{formatted.icon}</span>
                  <span className={formatted.color}>{formatted.text}</span>
                  <span className="text-terminal-orange/40">[{formatTimeAgo(event.createdAt)}]</span>
                </div>
              );
            })}
            {/* Duplicate for seamless loop */}
            {displayEvents.map((event, i) => {
              const formatted = formatEvent(event);
              return (
                <div
                  key={`${event.id}-${i}-dup`}
                  className="flex items-center gap-2 whitespace-nowrap font-mono text-xs"
                >
                  <span className={formatted.color}>{formatted.icon}</span>
                  <span className={formatted.color}>{formatted.text}</span>
                  <span className="text-terminal-orange/40">[{formatTimeAgo(event.createdAt)}]</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style jsx>{`
        .ticker-scroll {
          animation: ticker 60s linear infinite;
        }

        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .ticker-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}

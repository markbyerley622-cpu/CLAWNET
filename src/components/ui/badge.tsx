import { cn } from "@/lib/utils";
import type { ReputationTier, AgentStatus, RiskRating, TaskStatus } from "@/types";
import { REPUTATION_TIERS, RISK_RATINGS } from "@/lib/constants";

// =============================================================================
// TIER BADGE - Terminal Style with Neon Colors
// =============================================================================

interface TierBadgeProps {
  tier: ReputationTier;
  size?: "sm" | "md";
}

const tierColors: Record<ReputationTier, { bg: string; text: string; glow: string }> = {
  UNTRUSTED: { bg: "bg-zinc-800/50", text: "text-zinc-400", glow: "" },
  NEWCOMER: { bg: "bg-terminal-green/10", text: "text-terminal-green", glow: "shadow-[0_0_10px_rgba(0,255,65,0.3)]" },
  RELIABLE: { bg: "bg-terminal-cyan/10", text: "text-terminal-cyan", glow: "shadow-[0_0_10px_rgba(0,255,255,0.3)]" },
  TRUSTED: { bg: "bg-terminal-purple/10", text: "text-terminal-purple", glow: "shadow-[0_0_10px_rgba(191,95,255,0.3)]" },
  ELITE: { bg: "bg-terminal-pink/10", text: "text-terminal-pink", glow: "shadow-[0_0_10px_rgba(255,110,199,0.3)]" },
  LEGENDARY: { bg: "bg-terminal-amber/10", text: "text-terminal-amber", glow: "shadow-[0_0_10px_rgba(255,176,0,0.3)]" },
};

export function TierBadge({ tier, size = "md" }: TierBadgeProps) {
  const info = REPUTATION_TIERS[tier];
  const colors = tierColors[tier];

  return (
    <span
      className={cn(
        "badge border font-terminal",
        colors.bg,
        colors.text,
        colors.glow,
        `border-current`,
        size === "sm" ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1"
      )}
    >
      [{info.label.toUpperCase()}]
    </span>
  );
}

// =============================================================================
// STATUS BADGE - Terminal Style
// =============================================================================

interface StatusBadgeProps {
  status: AgentStatus;
}

const statusConfig: Record<AgentStatus, { label: string; className: string; icon: string }> = {
  ACTIVE: { label: "ONLINE", className: "bg-terminal-green/10 text-terminal-green border-terminal-green", icon: "●" },
  SUSPENDED: { label: "SUSPENDED", className: "bg-terminal-amber/10 text-terminal-amber border-terminal-amber", icon: "◐" },
  ARCHIVED: { label: "ARCHIVED", className: "bg-zinc-800/50 text-zinc-500 border-zinc-600", icon: "○" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span className={cn("badge border font-terminal", config.className)}>
      <span className={status === "ACTIVE" ? "animate-pulse mr-1" : "mr-1"}>{config.icon}</span>
      {config.label}
    </span>
  );
}

// =============================================================================
// RISK BADGE - Terminal Style
// =============================================================================

interface RiskBadgeProps {
  rating: RiskRating;
}

const riskConfig: Record<RiskRating, { className: string; icon: string }> = {
  LOW: { className: "bg-terminal-green/10 text-terminal-green border-terminal-green", icon: "▽" },
  MEDIUM: { className: "bg-terminal-amber/10 text-terminal-amber border-terminal-amber", icon: "◇" },
  HIGH: { className: "bg-orange-500/10 text-orange-400 border-orange-400", icon: "△" },
  CRITICAL: { className: "bg-terminal-red/10 text-terminal-red border-terminal-red", icon: "⚠" },
};

export function RiskBadge({ rating }: RiskBadgeProps) {
  const info = RISK_RATINGS[rating];
  const config = riskConfig[rating];

  return (
    <span className={cn("badge border font-terminal", config.className)}>
      <span className="mr-1">{config.icon}</span>
      {info.label.toUpperCase()}
    </span>
  );
}

// =============================================================================
// TASK STATUS BADGE - Terminal Style
// =============================================================================

interface TaskStatusBadgeProps {
  status: TaskStatus;
}

const taskStatusConfig: Record<TaskStatus, { label: string; className: string; icon: string }> = {
  OPEN: { label: "OPEN", className: "bg-terminal-cyan/10 text-terminal-cyan border-terminal-cyan", icon: "◉" },
  ASSIGNED: { label: "IN_PROGRESS", className: "bg-terminal-amber/10 text-terminal-amber border-terminal-amber", icon: "⟳" },
  PENDING_VALIDATION: { label: "VALIDATING", className: "bg-terminal-purple/10 text-terminal-purple border-terminal-purple", icon: "⌛" },
  COMPLETED: { label: "COMPLETED", className: "bg-terminal-green/10 text-terminal-green border-terminal-green", icon: "✓" },
  FAILED: { label: "FAILED", className: "bg-terminal-red/10 text-terminal-red border-terminal-red", icon: "✗" },
  EXPIRED: { label: "EXPIRED", className: "bg-zinc-800/50 text-zinc-500 border-zinc-600", icon: "⌀" },
  CANCELLED: { label: "CANCELLED", className: "bg-zinc-800/50 text-zinc-500 border-zinc-600", icon: "⊘" },
};

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const config = taskStatusConfig[status];
  return (
    <span className={cn("badge border font-terminal", config.className)}>
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </span>
  );
}

// =============================================================================
// ROLE BADGE - Terminal Style
// =============================================================================

interface RoleBadgeProps {
  role: string;
}

const roleColors: Record<string, string> = {
  COMPUTE: "text-terminal-cyan border-terminal-cyan/50 bg-terminal-cyan/10",
  VALIDATOR: "text-terminal-green border-terminal-green/50 bg-terminal-green/10",
  ANALYST: "text-terminal-purple border-terminal-purple/50 bg-terminal-purple/10",
  CREATIVE: "text-terminal-pink border-terminal-pink/50 bg-terminal-pink/10",
  ORCHESTRATOR: "text-terminal-amber border-terminal-amber/50 bg-terminal-amber/10",
  SPECIALIST: "text-white border-white/50 bg-white/10",
};

export function RoleBadge({ role }: RoleBadgeProps) {
  const colorClass = roleColors[role] || "text-terminal-green border-terminal-green/50 bg-terminal-green/10";

  return (
    <span className={cn("badge border font-terminal", colorClass)}>
      &lt;{role}&gt;
    </span>
  );
}

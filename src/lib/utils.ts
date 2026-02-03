import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ReputationTier, TaskDifficulty, RiskRating } from "@/types";
import { REPUTATION_TIERS } from "./constants";

// =============================================================================
// CLASSNAME UTILITIES
// =============================================================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// =============================================================================
// FORMATTING UTILITIES
// =============================================================================

/**
 * Format a bigint token amount with CLAW suffix
 */
export function formatTokenAmount(amount: bigint | number, decimals = 0): string {
  const num = typeof amount === "bigint" ? Number(amount) : amount;

  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M CLAW`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K CLAW`;
  }
  return `${num.toLocaleString()} CLAW`;
}

/**
 * Format a token amount without the suffix
 */
export function formatNumber(num: number | bigint): string {
  const n = typeof num === "bigint" ? Number(num) : num;
  return n.toLocaleString();
}

/**
 * Truncate a Solana address or ID for display
 */
export function truncateAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format a date as relative time (e.g., "2h ago", "3 days ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;

  return then.toLocaleDateString();
}

/**
 * Format duration in minutes to human readable
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Format countdown timer
 */
export function formatCountdown(targetDate: Date | string): string {
  const now = new Date();
  const target = new Date(targetDate);
  const diffMs = target.getTime() - now.getTime();

  if (diffMs <= 0) return "Expired";

  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const mins = diffMin % 60;

  if (diffHour > 24) {
    const days = Math.floor(diffHour / 24);
    return `${days}d ${diffHour % 24}h`;
  }
  if (diffHour > 0) {
    return `${diffHour}h ${mins}m`;
  }
  return `${diffMin}m`;
}

// =============================================================================
// REPUTATION UTILITIES
// =============================================================================

/**
 * Get tier from overall reputation score
 */
export function getTierFromScore(score: number): ReputationTier {
  if (score >= 900) return "LEGENDARY";
  if (score >= 800) return "ELITE";
  if (score >= 600) return "TRUSTED";
  if (score >= 400) return "RELIABLE";
  if (score >= 200) return "NEWCOMER";
  return "UNTRUSTED";
}

/**
 * Get tier display info
 */
export function getTierInfo(tier: ReputationTier) {
  return REPUTATION_TIERS[tier];
}

/**
 * Calculate success rate
 */
export function calculateSuccessRate(completed: number, failed: number): number {
  const total = completed + failed;
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

// =============================================================================
// TASK UTILITIES
// =============================================================================

/**
 * Calculate risk rating based on task parameters
 */
export function calculateRiskRating(
  difficulty: TaskDifficulty,
  slashPercentage: number,
  depositRequired: bigint,
  reward: bigint
): RiskRating {
  const difficultyScore = difficulty;
  const slashScore = slashPercentage / 20;
  const ratioScore = Math.min(5, (Number(depositRequired) / Number(reward)) * 5);

  const totalScore = (difficultyScore + slashScore + ratioScore) / 3;

  if (totalScore <= 1.5) return "LOW";
  if (totalScore <= 2.5) return "MEDIUM";
  if (totalScore <= 3.5) return "HIGH";
  return "CRITICAL";
}

/**
 * Check if a task deadline has passed
 */
export function isTaskExpired(expiresAt: Date | string): boolean {
  return new Date(expiresAt) < new Date();
}

/**
 * Calculate estimated runway in days
 */
export function calculateRunway(balance: bigint, burnRate: number): number {
  if (burnRate <= 0) return Infinity;
  return Math.floor(Number(balance) / burnRate);
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Generate a unique agent name
 */
export function generateAgentName(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let name = "AGENT-";
  for (let i = 0; i < 4; i++) {
    name += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return name;
}

/**
 * Validate a token amount
 */
export function isValidTokenAmount(amount: string | number): boolean {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return !isNaN(num) && num > 0 && Number.isFinite(num);
}

// =============================================================================
// SERIALIZATION UTILITIES
// =============================================================================

/**
 * Serialize data for JSON response, converting BigInt to strings
 */
export function serializeForJson<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );
}

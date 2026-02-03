import type {
  AgentRole,
  TaskCategory,
  TaskDifficulty,
  ReputationTier,
  RiskRating,
} from "@/types";

// =============================================================================
// AGENT CONSTANTS
// =============================================================================

export const AGENT_ROLES: Record<AgentRole, { label: string; description: string; icon: string }> = {
  COMPUTE: {
    label: "Compute",
    description: "General computation tasks",
    icon: "Zap",
  },
  VALIDATOR: {
    label: "Validator",
    description: "Verification and validation",
    icon: "CheckCircle",
  },
  ANALYST: {
    label: "Analyst",
    description: "Data analysis",
    icon: "BarChart",
  },
  CREATIVE: {
    label: "Creative",
    description: "Content generation",
    icon: "Palette",
  },
  ORCHESTRATOR: {
    label: "Orchestrator",
    description: "Coordinates other agents",
    icon: "GitBranch",
  },
  SPECIALIST: {
    label: "Specialist",
    description: "Domain-specific expert",
    icon: "Target",
  },
};

// =============================================================================
// TASK CONSTANTS
// =============================================================================

export const TASK_CATEGORIES: Record<TaskCategory, { label: string; description: string }> = {
  COMPUTATION: {
    label: "Computation",
    description: "Processing and calculation tasks",
  },
  VALIDATION: {
    label: "Validation",
    description: "Verification and checking tasks",
  },
  ANALYSIS: {
    label: "Analysis",
    description: "Data analysis and interpretation",
  },
  GENERATION: {
    label: "Generation",
    description: "Content and data generation",
  },
  ORCHESTRATION: {
    label: "Orchestration",
    description: "Multi-agent coordination",
  },
  RESEARCH: {
    label: "Research",
    description: "Investigation and discovery",
  },
};

export const TASK_DIFFICULTIES: Record<TaskDifficulty, { label: string; color: string }> = {
  1: { label: "Trivial", color: "text-zinc-400" },
  2: { label: "Easy", color: "text-green-400" },
  3: { label: "Medium", color: "text-yellow-400" },
  4: { label: "Hard", color: "text-orange-400" },
  5: { label: "Expert", color: "text-red-400" },
};

export const RISK_RATINGS: Record<RiskRating, { label: string; color: string }> = {
  LOW: { label: "Low", color: "text-green-400" },
  MEDIUM: { label: "Medium", color: "text-yellow-400" },
  HIGH: { label: "High", color: "text-orange-400" },
  CRITICAL: { label: "Critical", color: "text-red-400" },
};

// =============================================================================
// REPUTATION CONSTANTS
// =============================================================================

export const REPUTATION_TIERS: Record<
  ReputationTier,
  { label: string; minScore: number; maxScore: number; color: string }
> = {
  UNTRUSTED: { label: "Unknown", minScore: 0, maxScore: 199, color: "text-zinc-500" },
  NEWCOMER: { label: "Newcomer", minScore: 200, maxScore: 399, color: "text-zinc-400" },
  RELIABLE: { label: "Reliable", minScore: 400, maxScore: 599, color: "text-green-400" },
  TRUSTED: { label: "Proven", minScore: 600, maxScore: 799, color: "text-blue-400" },
  ELITE: { label: "Elite", minScore: 800, maxScore: 899, color: "text-purple-400" },
  LEGENDARY: { label: "Legendary", minScore: 900, maxScore: 1000, color: "text-amber-400" },
};

export const TIER_BG_COLORS: Record<ReputationTier, string> = {
  UNTRUSTED: "bg-zinc-500/20",
  NEWCOMER: "bg-zinc-400/20",
  RELIABLE: "bg-green-400/20",
  TRUSTED: "bg-blue-400/20",
  ELITE: "bg-purple-400/20",
  LEGENDARY: "bg-amber-400/20",
};

// =============================================================================
// ECONOMIC CONSTANTS
// =============================================================================

export const MIN_FUNDING_AMOUNT = 1000n; // Minimum to fund an agent
export const RECOMMENDED_FUNDING = 5000n; // Recommended starting amount
export const MIN_SURVIVAL_BALANCE = 0n; // Balance at which agent is archived

export const DEFAULT_SLASH_PERCENTAGE = 20; // Default penalty for failure
export const TIMEOUT_SLASH_PERCENTAGE = 100; // Penalty for timeout

export const PLATFORM_FEE_PERCENTAGE = 5; // Platform takes 5% of rewards

// =============================================================================
// REPUTATION MECHANICS
// =============================================================================

export const REPUTATION_CONFIG = {
  baseScore: 500,
  maxScore: 1000,
  minScore: 0,

  // Weights for overall score
  weights: {
    reliability: 0.5,
    quality: 0.3,
    speed: 0.2,
  },

  // Task completion deltas
  taskSuccess: {
    base: 5,
    difficultyMultipliers: { 1: 1.0, 2: 1.2, 3: 1.5, 4: 2.0, 5: 3.0 },
  },
  taskFailure: {
    base: -10,
    difficultyMultipliers: { 1: 1.0, 2: 1.2, 3: 1.5, 4: 2.0, 5: 3.0 },
  },
  taskTimeout: -50,
  taskAbandon: -40,

  // Streak bonuses
  streakInterval: 5,
  streakBonus: 10,
  maxDailyStreakBonus: 50,

  // Decay
  inactivityThresholdDays: 7,
  inactivityDecay: 5,
  decayFloor: 200,
};

// =============================================================================
// TIMING
// =============================================================================

export const DEFAULT_EXECUTION_WINDOW_MINUTES = 120;
export const MIN_EXECUTION_WINDOW_MINUTES = 15;
export const MAX_EXECUTION_WINDOW_MINUTES = 1440; // 24 hours

export const TASK_EXPIRY_HOURS = 24; // Default task listing expiry

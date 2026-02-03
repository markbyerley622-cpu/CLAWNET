// =============================================================================
// AGENT TYPES
// =============================================================================

export type AgentRole =
  | "COMPUTE"
  | "VALIDATOR"
  | "ANALYST"
  | "CREATIVE"
  | "ORCHESTRATOR"
  | "SPECIALIST";

export type AgentStatus = "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export interface AgentConfig {
  allowedCategories: TaskCategory[];
  maxBidAmount: number;
  minReputationRequired: number;
  synthetic?: boolean;
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  status: AgentStatus;
  config: AgentConfig;
  ownerWalletAddress: string | null;
  createdAt: Date;
  archivedAt: Date | null;
}

export interface AgentWithRelations extends Agent {
  wallet: Wallet | null;
  reputation: ReputationScore | null;
}

// =============================================================================
// WALLET TYPES
// =============================================================================

export interface Wallet {
  id: string;
  agentId: string;
  balance: bigint;
  escrowedBalance: bigint;
  totalEarned: bigint;
  totalSpent: bigint;
  solanaAddress: string | null;
  createdAt: Date;
  lastActivityAt: Date;
}

export interface WalletWithDerived extends Wallet {
  netBalance: bigint;
  burnRate: number;
  runwayDays: number;
}

export type TransactionType =
  | "FUNDING"
  | "TASK_DEPOSIT"
  | "TASK_REWARD"
  | "TASK_REFUND"
  | "TASK_SLASH"
  | "PLATFORM_FEE"
  | "SUBTASK_PAYMENT";

export type TransactionDirection = "CREDIT" | "DEBIT";

export interface Transaction {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: bigint;
  direction: TransactionDirection;
  taskId: string | null;
  counterpartyWalletId: string | null;
  description: string;
  solanaSignature: string | null;
  createdAt: Date;
}

// =============================================================================
// TASK TYPES
// =============================================================================

export type TaskCategory =
  | "COMPUTATION"
  | "VALIDATION"
  | "ANALYSIS"
  | "GENERATION"
  | "ORCHESTRATION"
  | "RESEARCH";

export type TaskStatus =
  | "OPEN"
  | "ASSIGNED"
  | "PENDING_VALIDATION"
  | "COMPLETED"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED";

export type RiskRating = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type TaskDifficulty = 1 | 2 | 3 | 4 | 5;

export interface TaskSchema {
  inputs: SchemaField[];
  outputs: SchemaField[];
  examples: TaskExample[];
}

export interface SchemaField {
  name: string;
  type: "string" | "number" | "boolean" | "json" | "array" | "file";
  required: boolean;
  description: string;
  constraints?: Record<string, unknown>;
}

export interface TaskExample {
  input: Record<string, unknown>;
  expectedOutput: Record<string, unknown>;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  difficulty: TaskDifficulty;
  schema: TaskSchema;
  validationLogic: string;
  requiredReputation: number;
  reward: bigint;
  depositRequired: bigint;
  slashPercentage: number;
  riskRating: RiskRating;
  executionWindowMinutes: number;
  expiresAt: Date;
  status: TaskStatus;
  posterId: string;
  assignedAgentId: string | null;
  createdAt: Date;
  acceptedAt: Date | null;
  completedAt: Date | null;
}

export interface TaskWithRelations extends Task {
  poster: Agent;
  assignedAgent: Agent | null;
  bids: Bid[];
}

// =============================================================================
// BID TYPES
// =============================================================================

export type BidStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";

export interface Bid {
  id: string;
  taskId: string;
  agentId: string;
  proposedReward: bigint;
  estimatedDuration: number;
  message: string;
  status: BidStatus;
  createdAt: Date;
  respondedAt: Date | null;
}

export interface BidWithAgent extends Bid {
  agent: Agent & { reputation: ReputationScore | null };
}

// =============================================================================
// REPUTATION TYPES
// =============================================================================

export type ReputationTier =
  | "UNTRUSTED"
  | "NEWCOMER"
  | "RELIABLE"
  | "TRUSTED"
  | "ELITE"
  | "LEGENDARY";

export type ReputationEventType =
  | "TASK_SUCCESS"
  | "TASK_FAILURE"
  | "TASK_TIMEOUT"
  | "INACTIVITY_DECAY"
  | "BONUS_STREAK"
  | "PENALTY_ABANDON";

export interface ReputationScore {
  agentId: string;
  reliability: number;
  quality: number;
  speed: number;
  overall: number;
  tier: ReputationTier;
  tasksCompleted: number;
  tasksFailed: number;
  totalTasksAttempted: number;
  currentStreak: number;
  longestStreak: number;
  lastTaskAt: Date | null;
  lastUpdatedAt: Date;
}

export interface ReputationEvent {
  id: string;
  agentId: string;
  eventType: ReputationEventType;
  delta: number;
  reason: string;
  taskId: string | null;
  scoreBefore: number;
  scoreAfter: number;
  createdAt: Date;
}

// =============================================================================
// LEADERBOARD TYPES
// =============================================================================

export interface LeaderboardEntry {
  agentId: string;
  rankByEarnings: number;
  rankByReliability: number;
  rankByLongevity: number;
  rankBySuccessRate: number;
  agentName: string;
  agentRole: AgentRole;
  agentStatus: AgentStatus;
  totalEarnings: bigint;
  reliability: number;
  activeDays: number;
  successRate: number;
  tier: ReputationTier;
  currentStreak: number;
  updatedAt: Date;
}

// =============================================================================
// ECONOMY GRAPH TYPES
// =============================================================================

export interface EconomyNode {
  id: string;
  label: string;
  role: AgentRole;
  tier: ReputationTier;
  balance: number;
  isActive: boolean;
}

export interface EconomyEdge {
  id: string;
  source: string;
  target: string;
  type: "task_payment" | "subtask";
  transactionCount: number;
  totalVolume: bigint;
  lastTransactionAt: Date;
}

// =============================================================================
// API TYPES
// =============================================================================

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

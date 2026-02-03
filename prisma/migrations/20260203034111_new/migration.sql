-- CreateEnum
CREATE TYPE "AgentRole" AS ENUM ('COMPUTE', 'VALIDATOR', 'ANALYST', 'CREATIVE', 'ORCHESTRATOR', 'SPECIALIST');

-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('FUNDING', 'TASK_DEPOSIT', 'TASK_REWARD', 'TASK_REFUND', 'TASK_SLASH', 'PLATFORM_FEE', 'SUBTASK_PAYMENT');

-- CreateEnum
CREATE TYPE "TransactionDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "TaskCategory" AS ENUM ('COMPUTATION', 'VALIDATION', 'ANALYSIS', 'GENERATION', 'ORCHESTRATION', 'RESEARCH');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'ASSIGNED', 'PENDING_VALIDATION', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RiskRating" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "BidStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ReputationTier" AS ENUM ('UNTRUSTED', 'NEWCOMER', 'RELIABLE', 'TRUSTED', 'ELITE', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "ReputationEventType" AS ENUM ('TASK_SUCCESS', 'TASK_FAILURE', 'TASK_TIMEOUT', 'INACTIVITY_DECAY', 'BONUS_STREAK', 'PENALTY_ABANDON');

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "AgentRole" NOT NULL,
    "status" "AgentStatus" NOT NULL DEFAULT 'ACTIVE',
    "ownerWalletAddress" TEXT,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "balance" BIGINT NOT NULL DEFAULT 0,
    "escrowedBalance" BIGINT NOT NULL DEFAULT 0,
    "totalEarned" BIGINT NOT NULL DEFAULT 0,
    "totalSpent" BIGINT NOT NULL DEFAULT 0,
    "solanaAddress" TEXT,
    "privateKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "direction" "TransactionDirection" NOT NULL,
    "taskId" TEXT,
    "counterpartyWalletId" TEXT,
    "description" TEXT NOT NULL,
    "solanaSignature" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "TaskCategory" NOT NULL,
    "difficulty" INTEGER NOT NULL DEFAULT 3,
    "schema" JSONB NOT NULL DEFAULT '{}',
    "validationLogic" TEXT NOT NULL DEFAULT '{"type":"schema"}',
    "requiredReputation" INTEGER NOT NULL DEFAULT 0,
    "reward" BIGINT NOT NULL,
    "depositRequired" BIGINT NOT NULL,
    "slashPercentage" INTEGER NOT NULL DEFAULT 20,
    "riskRating" "RiskRating" NOT NULL DEFAULT 'MEDIUM',
    "executionWindowMinutes" INTEGER NOT NULL DEFAULT 120,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "posterId" TEXT NOT NULL,
    "assignedAgentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskSubmission" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "output" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validationPassed" BOOLEAN,
    "validationScore" INTEGER,
    "validationErrors" JSONB,

    CONSTRAINT "TaskSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bid" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "proposedReward" BIGINT NOT NULL,
    "estimatedDuration" INTEGER NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "status" "BidStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReputationScore" (
    "agentId" TEXT NOT NULL,
    "reliability" INTEGER NOT NULL DEFAULT 500,
    "quality" INTEGER NOT NULL DEFAULT 500,
    "speed" INTEGER NOT NULL DEFAULT 500,
    "overall" INTEGER NOT NULL DEFAULT 500,
    "tier" "ReputationTier" NOT NULL DEFAULT 'NEWCOMER',
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "tasksFailed" INTEGER NOT NULL DEFAULT 0,
    "totalTasksAttempted" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastTaskAt" TIMESTAMP(3),
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReputationScore_pkey" PRIMARY KEY ("agentId")
);

-- CreateTable
CREATE TABLE "ReputationEvent" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "eventType" "ReputationEventType" NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "taskId" TEXT,
    "scoreBefore" INTEGER NOT NULL,
    "scoreAfter" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReputationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaderboardCache" (
    "agentId" TEXT NOT NULL,
    "rankByEarnings" INTEGER NOT NULL,
    "rankByReliability" INTEGER NOT NULL,
    "rankByLongevity" INTEGER NOT NULL,
    "rankBySuccessRate" INTEGER NOT NULL,
    "agentName" TEXT NOT NULL,
    "agentRole" "AgentRole" NOT NULL,
    "agentStatus" "AgentStatus" NOT NULL,
    "totalEarnings" BIGINT NOT NULL,
    "reliability" INTEGER NOT NULL,
    "activeDays" INTEGER NOT NULL,
    "successRate" DOUBLE PRECISION NOT NULL,
    "tier" "ReputationTier" NOT NULL,
    "currentStreak" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaderboardCache_pkey" PRIMARY KEY ("agentId")
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationState" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "lastAgentSpawnAt" TIMESTAMP(3),
    "lastTaskBatchAt" TIMESTAMP(3),
    "lastLeaderboardUpdate" TIMESTAMP(3),
    "firstCapReachedAt" TIMESTAMP(3),
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "tickCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Agent_status_idx" ON "Agent"("status");

-- CreateIndex
CREATE INDEX "Agent_role_idx" ON "Agent"("role");

-- CreateIndex
CREATE INDEX "Agent_createdAt_idx" ON "Agent"("createdAt");

-- CreateIndex
CREATE INDEX "Agent_ownerWalletAddress_idx" ON "Agent"("ownerWalletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_agentId_key" ON "Wallet"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_solanaAddress_key" ON "Wallet"("solanaAddress");

-- CreateIndex
CREATE INDEX "Wallet_solanaAddress_idx" ON "Wallet"("solanaAddress");

-- CreateIndex
CREATE INDEX "Transaction_walletId_createdAt_idx" ON "Transaction"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_taskId_idx" ON "Transaction"("taskId");

-- CreateIndex
CREATE INDEX "Task_status_category_idx" ON "Task"("status", "category");

-- CreateIndex
CREATE INDEX "Task_posterId_idx" ON "Task"("posterId");

-- CreateIndex
CREATE INDEX "Task_assignedAgentId_idx" ON "Task"("assignedAgentId");

-- CreateIndex
CREATE INDEX "Task_expiresAt_idx" ON "Task"("expiresAt");

-- CreateIndex
CREATE INDEX "Task_createdAt_idx" ON "Task"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TaskSubmission_taskId_key" ON "TaskSubmission"("taskId");

-- CreateIndex
CREATE INDEX "Bid_agentId_idx" ON "Bid"("agentId");

-- CreateIndex
CREATE INDEX "Bid_status_idx" ON "Bid"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Bid_taskId_agentId_key" ON "Bid"("taskId", "agentId");

-- CreateIndex
CREATE INDEX "ReputationScore_overall_idx" ON "ReputationScore"("overall");

-- CreateIndex
CREATE INDEX "ReputationScore_tier_idx" ON "ReputationScore"("tier");

-- CreateIndex
CREATE INDEX "ReputationEvent_agentId_createdAt_idx" ON "ReputationEvent"("agentId", "createdAt");

-- CreateIndex
CREATE INDEX "LeaderboardCache_rankByEarnings_idx" ON "LeaderboardCache"("rankByEarnings");

-- CreateIndex
CREATE INDEX "LeaderboardCache_rankByReliability_idx" ON "LeaderboardCache"("rankByReliability");

-- CreateIndex
CREATE INDEX "LeaderboardCache_rankByLongevity_idx" ON "LeaderboardCache"("rankByLongevity");

-- CreateIndex
CREATE INDEX "LeaderboardCache_rankBySuccessRate_idx" ON "LeaderboardCache"("rankBySuccessRate");

-- CreateIndex
CREATE INDEX "ActivityEvent_createdAt_idx" ON "ActivityEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityEvent_type_idx" ON "ActivityEvent"("type");

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_posterId_fkey" FOREIGN KEY ("posterId") REFERENCES "Agent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskSubmission" ADD CONSTRAINT "TaskSubmission_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReputationScore" ADD CONSTRAINT "ReputationScore_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReputationEvent" ADD CONSTRAINT "ReputationEvent_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "ReputationScore"("agentId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReputationEvent" ADD CONSTRAINT "ReputationEvent_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

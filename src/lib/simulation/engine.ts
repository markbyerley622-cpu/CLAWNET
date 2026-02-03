import { db, isShuttingDown } from "@/lib/db";
import { AgentService } from "@/lib/services/agent";
import { ActivityService } from "@/lib/services/activity";
import { generateUniqueAgentName } from "./names";
import { generateWeightedTaskBatch } from "./tasks";
import {
  calculateTaskOutcome,
  calculateQualityScore,
  calculateReputationDelta,
  generateOutcomeSeed,
} from "./outcomes";
import {
  TIMING,
  LIMITS,
  GROWTH_CAPS,
  shouldTrigger,
  calculateSpawnProbability,
  calculateTaskBatchSize,
  checkGrowthCap,
} from "./scheduler";
import { SimulationStateService } from "./state";
import type { AgentRole } from "@/types";

// =============================================================================
// SIMULATION ENGINE - Main Orchestrator
// =============================================================================

export interface TickResult {
  success: boolean;
  tickCount: number;
  actions: {
    agentsSpawned: number;
    tasksGenerated: number;
    tasksCompleted: number;
    tasksFailed: number;
    eventsLogged: number;
  };
  errors: string[];
}

// Role distribution weights for synthetic agents
const ROLE_WEIGHTS: Record<AgentRole, number> = {
  COMPUTE: 35,
  VALIDATOR: 25,
  ANALYST: 15,
  CREATIVE: 10,
  ORCHESTRATOR: 10,
  SPECIALIST: 5,
};

// Initial funding ranges by role
const FUNDING_RANGES: Record<AgentRole, [number, number]> = {
  COMPUTE: [5000, 15000],
  VALIDATOR: [3000, 10000],
  ANALYST: [4000, 12000],
  CREATIVE: [3000, 8000],
  ORCHESTRATOR: [10000, 25000],
  SPECIALIST: [5000, 15000],
};

/**
 * Select random role based on weights
 */
function selectWeightedRole(): AgentRole {
  const totalWeight = Object.values(ROLE_WEIGHTS).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (const [role, weight] of Object.entries(ROLE_WEIGHTS)) {
    random -= weight;
    if (random <= 0) {
      return role as AgentRole;
    }
  }

  return "COMPUTE"; // Fallback
}

/**
 * Generate random funding amount for a role
 */
function generateFunding(role: AgentRole): bigint {
  const [min, max] = FUNDING_RANGES[role];
  return BigInt(Math.floor(Math.random() * (max - min + 1)) + min);
}

export class SimulationEngine {
  /**
   * Execute a single simulation tick
   */
  static async tick(): Promise<TickResult> {
    const result: TickResult = {
      success: true,
      tickCount: 0,
      actions: {
        agentsSpawned: 0,
        tasksGenerated: 0,
        tasksCompleted: 0,
        tasksFailed: 0,
        eventsLogged: 0,
      },
      errors: [],
    };

    try {
      // Check if system is shutting down
      if (isShuttingDown()) {
        result.errors.push("System is shutting down");
        return result;
      }

      // Check if simulation is enabled
      if (process.env.SIMULATION_ENABLED !== "true") {
        result.errors.push("Simulation is disabled");
        return result;
      }

      // Check if paused
      if (await SimulationStateService.isPaused()) {
        result.errors.push("Simulation is paused");
        return result;
      }

      const state = await SimulationStateService.get();
      result.tickCount = await SimulationStateService.incrementTick();

      // 1. Automatic agent spawning is DISABLED
      // Agents can only be created manually via /deploy or admin controls
      // The maybeSpawnAgent() method is preserved for potential future use
      result.actions.agentsSpawned = 0;

      // 2. Check if we should generate new tasks
      if (shouldTrigger(state.lastTaskBatchAt, TIMING.TASK_BATCH_INTERVAL_MIN)) {
        const generated = await this.maybeGenerateTasks();
        result.actions.tasksGenerated = generated;
        result.actions.eventsLogged += generated;
      }

      // 2.5. Auto-assign agents to open tasks
      await this.autoAssignTasks();

      // 3. Process pending task completions (instantly)
      const completions = await this.processTaskCompletions();
      result.actions.tasksCompleted = completions.completed;
      result.actions.tasksFailed = completions.failed;
      result.actions.eventsLogged += completions.completed + completions.failed;

      // 4. Update leaderboard if needed
      if (shouldTrigger(state.lastLeaderboardUpdate, TIMING.LEADERBOARD_UPDATE_INTERVAL)) {
        await this.updateLeaderboard();
        await SimulationStateService.recordLeaderboardUpdate();
      }

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : "Unknown error");
    }

    return result;
  }

  /**
   * Maybe spawn a new synthetic agent
   */
  private static async maybeSpawnAgent(): Promise<number> {
    // Count current active agents
    const activeCount = await db.agent.count({
      where: { status: "ACTIVE" },
    });

    // Check growth caps
    const state = await SimulationStateService.get();
    const growthCheck = checkGrowthCap(activeCount, state.firstCapReachedAt);

    if (!growthCheck.canSpawn) {
      console.log(`[SIMULATION] Agent spawn blocked: ${growthCheck.reason}`);

      // If just hit first cap, record the timestamp
      if (activeCount >= GROWTH_CAPS.FIRST_CAP && !state.firstCapReachedAt) {
        await SimulationStateService.recordFirstCapReached();
      }

      return 0;
    }

    // Calculate spawn probability (already accounts for caps)
    const probability = calculateSpawnProbability(activeCount);
    if (Math.random() > probability) {
      return 0;
    }

    // Select role and generate agent
    const role = selectWeightedRole();
    const name = generateUniqueAgentName();
    const funding = generateFunding(role);

    try {
      const agent = await AgentService.create({
        name,
        role,
        config: {
          allowedCategories: ["COMPUTATION", "VALIDATION", "ANALYSIS"],
          maxBidAmount: Number(funding) / 5,
          minReputationRequired: 0,
          synthetic: true, // Mark as synthetic
        },
        initialFunding: funding,
      });

      // Log activity event
      await ActivityService.logAgentDeployed(agent.id, name, role, funding);
      await SimulationStateService.recordAgentSpawn();

      console.log(`[SIMULATION] Spawned agent ${name} (${activeCount + 1} total)`);

      return 1;
    } catch (error) {
      console.error("Failed to spawn agent:", error);
      return 0;
    }
  }

  /**
   * Maybe generate new tasks
   */
  private static async maybeGenerateTasks(): Promise<number> {
    // Count current open tasks
    const openCount = await db.task.count({
      where: { status: "OPEN" },
    });

    // Calculate how many tasks to generate
    const batchSize = calculateTaskBatchSize(openCount);
    if (batchSize === 0) {
      return 0;
    }

    // Get active agents who can post tasks (any active agent can post)
    const eligiblePosters = await db.agent.findMany({
      where: {
        status: "ACTIVE",
      },
      include: { wallet: true },
      take: 50,
    });

    if (eligiblePosters.length === 0) {
      console.log("[SIMULATION] No active agents to post tasks");
      return 0;
    }

    // Generate tasks
    const taskTemplates = generateWeightedTaskBatch(batchSize);
    let generated = 0;

    for (const template of taskTemplates) {
      // Select random poster
      const poster = eligiblePosters[Math.floor(Math.random() * eligiblePosters.length)];

      try {
        const task = await db.task.create({
          data: {
            ...template,
            posterId: poster.id,
            status: "OPEN",
          },
        });

        // Log activity event
        await ActivityService.logTaskCreated(
          poster.id,
          poster.name,
          task.id,
          task.title,
          task.category,
          task.reward
        );

        generated++;
      } catch (error) {
        console.error("Failed to create task:", error);
      }
    }

    if (generated > 0) {
      await SimulationStateService.recordTaskBatch();
    }

    return generated;
  }

  /**
   * Auto-assign agents to open tasks
   */
  private static async autoAssignTasks(): Promise<number> {
    // Get open tasks
    const openTasks = await db.task.findMany({
      where: { status: "OPEN" },
      take: 10,
    });

    if (openTasks.length === 0) return 0;

    // Get eligible agents (active with enough balance)
    const eligibleAgents = await db.agent.findMany({
      where: {
        status: "ACTIVE",
        wallet: {
          balance: { gte: 500 },
        },
      },
      include: { wallet: true, reputation: true },
    });

    if (eligibleAgents.length === 0) return 0;

    let assigned = 0;

    for (const task of openTasks) {
      // Find agents who meet requirements and aren't already assigned to a task
      const availableAgents = eligibleAgents.filter(
        (a) =>
          a.reputation &&
          a.reputation.overall >= task.requiredReputation &&
          a.wallet &&
          a.wallet.balance >= task.depositRequired
      );

      if (availableAgents.length === 0) continue;

      // Pick random agent
      const agent = availableAgents[Math.floor(Math.random() * availableAgents.length)];

      try {
        // Create bid and accept it in one go
        const bid = await db.bid.create({
          data: {
            taskId: task.id,
            agentId: agent.id,
            proposedReward: task.reward,
            estimatedDuration: task.executionWindowMinutes,
            message: "Auto-assigned",
            status: "ACCEPTED",
            respondedAt: new Date(),
          },
        });

        // Assign task
        await db.task.update({
          where: { id: task.id },
          data: {
            status: "ASSIGNED",
            assignedAgentId: agent.id,
            acceptedAt: new Date(),
          },
        });

        // Log activity
        await ActivityService.logBidAccepted(
          agent.id,
          agent.name,
          task.id,
          task.title,
          task.reward
        );

        assigned++;
      } catch (error) {
        console.error("Failed to auto-assign task:", error);
      }
    }

    return assigned;
  }

  /**
   * Process pending task completions
   */
  private static async processTaskCompletions(): Promise<{ completed: number; failed: number }> {
    // Find assigned tasks - process immediately (no delay)
    const pendingTasks = await db.task.findMany({
      where: {
        status: "ASSIGNED",
      },
      include: {
        assignedAgent: {
          include: { reputation: true },
        },
      },
      take: LIMITS.MAX_COMPLETIONS_PER_TICK,
    });

    let completed = 0;
    let failed = 0;

    for (const task of pendingTasks) {
      if (!task.assignedAgent || !task.assignedAgent.reputation) continue;

      const agent = task.assignedAgent;
      const reputation = agent.reputation!;

      // Generate deterministic outcome
      const seed = generateOutcomeSeed(task.id, agent.id, task.acceptedAt?.getTime() || Date.now());
      const success = calculateTaskOutcome(reputation.overall, task.difficulty, seed);

      try {
        if (success) {
          // Calculate quality score
          const qualityScore = calculateQualityScore(reputation.overall, task.difficulty, seed);

          // Update task status
          await db.task.update({
            where: { id: task.id },
            data: {
              status: "COMPLETED",
              completedAt: new Date(),
            },
          });

          // Create submission
          await db.taskSubmission.create({
            data: {
              taskId: task.id,
              output: { result: "simulated_output", quality: qualityScore },
              validationPassed: true,
              validationScore: qualityScore,
            },
          });

          // Update reputation
          const repDelta = calculateReputationDelta(
            true,
            task.difficulty,
            qualityScore,
            reputation.currentStreak
          );

          const newOverall = Math.min(1000, reputation.overall + repDelta);
          const newStreak = reputation.currentStreak + 1;

          await db.reputationScore.update({
            where: { agentId: agent.id },
            data: {
              overall: newOverall,
              tasksCompleted: { increment: 1 },
              totalTasksAttempted: { increment: 1 },
              currentStreak: newStreak,
              longestStreak: Math.max(reputation.longestStreak, newStreak),
              lastTaskAt: new Date(),
            },
          });

          // Log activity
          await ActivityService.logTaskCompleted(
            agent.id,
            agent.name,
            task.id,
            task.title,
            task.reward
          );

          // Check for streak bonus
          if (newStreak > 0 && newStreak % 5 === 0) {
            await ActivityService.logStreakBonus(agent.id, agent.name, newStreak, 10);
          }

          completed++;
        } else {
          // Task failed
          await db.task.update({
            where: { id: task.id },
            data: {
              status: "FAILED",
              completedAt: new Date(),
            },
          });

          // Update reputation
          const repDelta = calculateReputationDelta(false, task.difficulty, 0, 0);
          const newOverall = Math.max(0, reputation.overall + repDelta);

          await db.reputationScore.update({
            where: { agentId: agent.id },
            data: {
              overall: newOverall,
              tasksFailed: { increment: 1 },
              totalTasksAttempted: { increment: 1 },
              currentStreak: 0, // Reset streak
              lastTaskAt: new Date(),
            },
          });

          // Calculate slash amount
          const slashAmount = (task.depositRequired * BigInt(task.slashPercentage)) / 100n;

          // Log activity
          await ActivityService.logTaskFailed(
            agent.id,
            agent.name,
            task.id,
            task.title,
            slashAmount
          );

          failed++;
        }
      } catch (error) {
        console.error("Failed to process task completion:", error);
      }
    }

    return { completed, failed };
  }

  /**
   * Update leaderboard cache using batched transaction
   */
  private static async updateLeaderboard(): Promise<void> {
    // Check shutdown before expensive operation
    if (isShuttingDown()) return;

    // Get all active agents with their stats
    const agents = await db.agent.findMany({
      where: { status: "ACTIVE" },
      include: {
        wallet: true,
        reputation: true,
      },
      orderBy: { createdAt: "asc" },
    });

    if (agents.length === 0) return;

    // Sort by different metrics for rankings
    const byEarnings = [...agents].sort(
      (a, b) => Number(b.wallet?.totalEarned || 0n) - Number(a.wallet?.totalEarned || 0n)
    );
    const byReliability = [...agents].sort(
      (a, b) => (b.reputation?.reliability || 0) - (a.reputation?.reliability || 0)
    );
    const byLongevity = [...agents].sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );
    const bySuccessRate = [...agents].sort((a, b) => {
      const aRate = a.reputation?.totalTasksAttempted
        ? (a.reputation.tasksCompleted / a.reputation.totalTasksAttempted)
        : 0;
      const bRate = b.reputation?.totalTasksAttempted
        ? (b.reputation.tasksCompleted / b.reputation.totalTasksAttempted)
        : 0;
      return bRate - aRate;
    });

    // Pre-compute rank lookups for O(1) access
    const earningsRank = new Map(byEarnings.map((a, i) => [a.id, i + 1]));
    const reliabilityRank = new Map(byReliability.map((a, i) => [a.id, i + 1]));
    const longevityRank = new Map(byLongevity.map((a, i) => [a.id, i + 1]));
    const successRateRank = new Map(bySuccessRate.map((a, i) => [a.id, i + 1]));

    // Batch upsert in a transaction for consistency and performance
    const BATCH_SIZE = 50;
    const validAgents = agents.filter((a) => a.wallet && a.reputation);
    const agentIds = validAgents.map((a) => a.id);

    await db.$transaction(async (tx) => {
      // Process in batches to avoid overwhelming the database
      for (let i = 0; i < validAgents.length; i += BATCH_SIZE) {
        if (isShuttingDown()) return;

        const batch = validAgents.slice(i, i + BATCH_SIZE);

        await Promise.all(
          batch.map((agent) => {
            const activeDays = Math.floor(
              (Date.now() - agent.createdAt.getTime()) / (24 * 60 * 60 * 1000)
            );

            const successRate = agent.reputation!.totalTasksAttempted > 0
              ? agent.reputation!.tasksCompleted / agent.reputation!.totalTasksAttempted
              : 0;

            const data = {
              rankByEarnings: earningsRank.get(agent.id) || 999,
              rankByReliability: reliabilityRank.get(agent.id) || 999,
              rankByLongevity: longevityRank.get(agent.id) || 999,
              rankBySuccessRate: successRateRank.get(agent.id) || 999,
              agentName: agent.name,
              agentRole: agent.role,
              agentStatus: agent.status,
              totalEarnings: agent.wallet!.totalEarned,
              reliability: agent.reputation!.reliability,
              activeDays,
              successRate,
              tier: agent.reputation!.tier,
              currentStreak: agent.reputation!.currentStreak,
            };

            return tx.leaderboardCache.upsert({
              where: { agentId: agent.id },
              create: { agentId: agent.id, ...data },
              update: { ...data, updatedAt: new Date() },
            });
          })
        );
      }

      // Remove entries for archived agents in the same transaction
      await tx.leaderboardCache.deleteMany({
        where: {
          agentId: { notIn: agentIds },
        },
      });
    });
  }

  /**
   * Get current simulation status
   */
  static async getStatus() {
    const state = await SimulationStateService.get();
    const agentCount = await db.agent.count({ where: { status: "ACTIVE" } });
    const taskCount = await db.task.count({ where: { status: "OPEN" } });
    const recentActivity = await db.activityEvent.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
      },
    });

    return {
      state,
      stats: {
        activeAgents: agentCount,
        openTasks: taskCount,
        activityLastHour: recentActivity,
      },
      limits: LIMITS,
      timing: TIMING,
    };
  }
}

import { db } from "@/lib/db";
import type { Task, TaskWithRelations, TaskCategory, TaskStatus, Bid } from "@/types";
import { WalletService } from "./wallet";
import { ReputationService } from "./reputation";

// =============================================================================
// TASK SERVICE
// =============================================================================

export class TaskService {
  /**
   * Create a new task
   */
  static async create(params: {
    title: string;
    description: string;
    category: TaskCategory;
    difficulty: number;
    schema: any;
    validationLogic: string;
    requiredReputation: number;
    reward: bigint;
    depositRequired: bigint;
    slashPercentage: number;
    executionWindowMinutes: number;
    expiresAt: Date;
    posterId: string;
  }): Promise<Task> {
    const riskRating = this.calculateRiskRating(
      params.difficulty,
      params.slashPercentage,
      params.depositRequired,
      params.reward
    );

    const task = await db.task.create({
      data: {
        ...params,
        schema: params.schema,
        riskRating,
        status: "OPEN",
      },
    });

    return task as unknown as Task;
  }

  /**
   * List available tasks
   */
  static async list(params?: {
    category?: TaskCategory;
    status?: TaskStatus;
    minReward?: bigint;
    maxDeposit?: bigint;
    maxDifficulty?: number;
    page?: number;
    pageSize?: number;
  }) {
    const {
      category,
      status = "OPEN",
      minReward,
      maxDeposit,
      maxDifficulty,
      page = 1,
      pageSize = 20,
    } = params || {};

    const where: any = { status };
    if (category) where.category = category;
    if (minReward) where.reward = { gte: minReward };
    if (maxDeposit) where.depositRequired = { lte: maxDeposit };
    if (maxDifficulty) where.difficulty = { lte: maxDifficulty };

    const [tasks, total] = await Promise.all([
      db.task.findMany({
        where,
        include: {
          poster: {
            include: { reputation: true },
          },
          bids: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      db.task.count({ where }),
    ]);

    return {
      data: tasks as unknown as TaskWithRelations[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get task by ID
   */
  static async getById(id: string): Promise<TaskWithRelations | null> {
    const task = await db.task.findUnique({
      where: { id },
      include: {
        poster: {
          include: { reputation: true },
        },
        assignedAgent: {
          include: { reputation: true },
        },
        bids: {
          include: {
            agent: {
              include: { reputation: true },
            },
          },
        },
      },
    });

    return task as unknown as TaskWithRelations | null;
  }

  /**
   * Submit a bid on a task
   */
  static async submitBid(params: {
    taskId: string;
    agentId: string;
    proposedReward: bigint;
    estimatedDuration: number;
    message?: string;
  }): Promise<Bid> {
    const { taskId, agentId, proposedReward, estimatedDuration, message = "" } = params;

    // Verify task is open
    const task = await db.task.findUnique({
      where: { id: taskId },
    });

    if (!task) throw new Error("Task not found");
    if (task.status !== "OPEN") throw new Error("Task is not open for bidding");

    // Verify agent can bid
    const agent = await db.agent.findUnique({
      where: { id: agentId },
      include: { reputation: true, wallet: true },
    });

    if (!agent) throw new Error("Agent not found");
    if (agent.status !== "ACTIVE") throw new Error("Agent is not active");
    if (!agent.reputation || agent.reputation.overall < task.requiredReputation) {
      throw new Error("Agent does not meet reputation requirements");
    }
    if (!agent.wallet || agent.wallet.balance < task.depositRequired) {
      throw new Error("Agent has insufficient balance for deposit");
    }

    // Create bid
    const bid = await db.bid.create({
      data: {
        taskId,
        agentId,
        proposedReward,
        estimatedDuration,
        message,
        status: "PENDING",
      },
    });

    return bid as unknown as Bid;
  }

  /**
   * Accept a bid and assign task to agent
   */
  static async acceptBid(bidId: string): Promise<void> {
    await db.$transaction(async (tx) => {
      const bid = await tx.bid.findUnique({
        where: { id: bidId },
        include: { task: true },
      });

      if (!bid) throw new Error("Bid not found");
      if (bid.status !== "PENDING") throw new Error("Bid is not pending");
      if (bid.task.status !== "OPEN") throw new Error("Task is no longer open");

      // Update bid status
      await tx.bid.update({
        where: { id: bidId },
        data: { status: "ACCEPTED", respondedAt: new Date() },
      });

      // Reject other bids
      await tx.bid.updateMany({
        where: {
          taskId: bid.taskId,
          id: { not: bidId },
          status: "PENDING",
        },
        data: { status: "REJECTED", respondedAt: new Date() },
      });

      // Assign task
      await tx.task.update({
        where: { id: bid.taskId },
        data: {
          status: "ASSIGNED",
          assignedAgentId: bid.agentId,
          acceptedAt: new Date(),
        },
      });
    });

    // Escrow deposit (outside transaction for wallet service)
    const bid = await db.bid.findUnique({
      where: { id: bidId },
      include: { task: true },
    });

    if (bid) {
      await WalletService.escrowDeposit(bid.agentId, bid.taskId, bid.task.depositRequired);
    }
  }

  /**
   * Submit task completion
   */
  static async submitCompletion(taskId: string, agentId: string, output: any): Promise<void> {
    const task = await db.task.findUnique({
      where: { id: taskId },
    });

    if (!task) throw new Error("Task not found");
    if (task.status !== "ASSIGNED") throw new Error("Task is not assigned");
    if (task.assignedAgentId !== agentId) throw new Error("Agent is not assigned to this task");

    // Check deadline
    const deadline = new Date(
      task.acceptedAt!.getTime() + task.executionWindowMinutes * 60 * 1000
    );
    if (new Date() > deadline) {
      throw new Error("Execution window has expired");
    }

    // Create submission
    await db.taskSubmission.create({
      data: {
        taskId,
        output,
        submittedAt: new Date(),
      },
    });

    // Update task status
    await db.task.update({
      where: { id: taskId },
      data: { status: "PENDING_VALIDATION" },
    });
  }

  /**
   * Complete task (after validation passes)
   */
  static async complete(taskId: string): Promise<void> {
    const task = await db.task.findUnique({
      where: { id: taskId },
    });

    if (!task || !task.assignedAgentId) throw new Error("Task not found or not assigned");

    // Update task status
    await db.task.update({
      where: { id: taskId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // Release deposit and pay reward
    await WalletService.releaseDeposit(task.assignedAgentId, taskId, task.depositRequired);
    await WalletService.payReward(task.assignedAgentId, taskId, task.reward);

    // Update reputation
    await ReputationService.recordTaskSuccess(task.assignedAgentId, taskId, task.difficulty);
  }

  /**
   * Fail task (after validation fails)
   */
  static async fail(taskId: string): Promise<void> {
    const task = await db.task.findUnique({
      where: { id: taskId },
    });

    if (!task || !task.assignedAgentId) throw new Error("Task not found or not assigned");

    // Update task status
    await db.task.update({
      where: { id: taskId },
      data: { status: "FAILED", completedAt: new Date() },
    });

    // Slash deposit
    await WalletService.slashDeposit(
      task.assignedAgentId,
      taskId,
      task.depositRequired,
      task.slashPercentage
    );

    // Update reputation
    await ReputationService.recordTaskFailure(task.assignedAgentId, taskId, task.difficulty);
  }

  /**
   * Calculate risk rating
   */
  private static calculateRiskRating(
    difficulty: number,
    slashPercentage: number,
    depositRequired: bigint,
    reward: bigint
  ): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
    const difficultyScore = difficulty;
    const slashScore = slashPercentage / 20;
    const ratioScore = Math.min(5, (Number(depositRequired) / Number(reward)) * 5);

    const totalScore = (difficultyScore + slashScore + ratioScore) / 3;

    if (totalScore <= 1.5) return "LOW";
    if (totalScore <= 2.5) return "MEDIUM";
    if (totalScore <= 3.5) return "HIGH";
    return "CRITICAL";
  }
}

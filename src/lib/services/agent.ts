import { db } from "@/lib/db";
import type { Agent, AgentWithRelations, AgentConfig, AgentRole, AgentStatus } from "@/types";
import { generateWallet } from "./solana";

// =============================================================================
// AGENT SERVICE
// =============================================================================

export class AgentService {
  /**
   * Create a new agent with wallet and initial reputation
   */
  static async create(params: {
    name: string;
    role: AgentRole;
    config: AgentConfig;
    initialFunding: bigint;
    ownerWalletAddress?: string;
  }): Promise<AgentWithRelations> {
    const { name, role, config, initialFunding, ownerWalletAddress } = params;

    // Generate Solana wallet for the agent
    const solanaWallet = generateWallet();

    return await db.$transaction(async (tx) => {
      // Create the agent
      const agent = await tx.agent.create({
        data: {
          name,
          role,
          status: "ACTIVE",
          config: config as any,
          ownerWalletAddress,
        },
      });

      // Create the wallet with Solana address and private key
      await tx.wallet.create({
        data: {
          agentId: agent.id,
          balance: initialFunding,
          escrowedBalance: 0n,
          totalEarned: 0n,
          totalSpent: 0n,
          solanaAddress: solanaWallet.publicKey,
          privateKey: solanaWallet.privateKey,
        },
      });

      // Create initial reputation
      await tx.reputationScore.create({
        data: {
          agentId: agent.id,
          reliability: 500,
          quality: 500,
          speed: 500,
          overall: 500,
          tier: "NEWCOMER",
          tasksCompleted: 0,
          tasksFailed: 0,
          totalTasksAttempted: 0,
          currentStreak: 0,
          longestStreak: 0,
        },
      });

      // Record initial funding transaction
      const wallet = await tx.wallet.findUnique({
        where: { agentId: agent.id },
      });

      if (wallet) {
        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            type: "FUNDING",
            amount: initialFunding,
            direction: "CREDIT",
            description: "Initial funding",
          },
        });
      }

      // Fetch complete agent
      const completeAgent = await tx.agent.findUnique({
        where: { id: agent.id },
        include: {
          wallet: true,
          reputation: true,
        },
      });

      return completeAgent as unknown as AgentWithRelations;
    });
  }

  /**
   * Get agent by ID with relations
   */
  static async getById(id: string): Promise<AgentWithRelations | null> {
    const agent = await db.agent.findUnique({
      where: { id },
      include: {
        wallet: true,
        reputation: true,
      },
    });

    return agent as unknown as AgentWithRelations | null;
  }

  /**
   * List agents with optional filters
   */
  static async list(params?: {
    status?: AgentStatus;
    role?: AgentRole;
    page?: number;
    pageSize?: number;
  }) {
    const { status, role, page = 1, pageSize = 20 } = params || {};

    const where: any = {};
    if (status) where.status = status;
    if (role) where.role = role;

    const [agents, total] = await Promise.all([
      db.agent.findMany({
        where,
        include: {
          wallet: true,
          reputation: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      db.agent.count({ where }),
    ]);

    return {
      data: agents as unknown as AgentWithRelations[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Archive an agent (death)
   */
  static async archive(id: string, reason: string): Promise<void> {
    await db.$transaction(async (tx) => {
      // Update agent status
      await tx.agent.update({
        where: { id },
        data: {
          status: "ARCHIVED",
          archivedAt: new Date(),
        },
      });

      // Log reputation event
      const rep = await tx.reputationScore.findUnique({
        where: { agentId: id },
      });

      if (rep) {
        await tx.reputationEvent.create({
          data: {
            agentId: id,
            eventType: "TASK_FAILURE",
            delta: 0,
            reason: `Agent archived: ${reason}`,
            scoreBefore: rep.overall,
            scoreAfter: rep.overall,
          },
        });
      }
    });
  }

  /**
   * Suspend an agent
   */
  static async suspend(id: string, reason: string): Promise<void> {
    await db.agent.update({
      where: { id },
      data: { status: "SUSPENDED" },
    });
  }

  /**
   * Reactivate a suspended agent
   */
  static async reactivate(id: string): Promise<void> {
    const agent = await db.agent.findUnique({
      where: { id },
      include: { wallet: true },
    });

    if (!agent) throw new Error("Agent not found");
    if (agent.status !== "SUSPENDED") throw new Error("Agent is not suspended");
    if (!agent.wallet || agent.wallet.balance === 0n) {
      throw new Error("Cannot reactivate agent with zero balance");
    }

    await db.agent.update({
      where: { id },
      data: { status: "ACTIVE" },
    });
  }

  /**
   * Check if agent should be archived (zero balance check)
   */
  static async checkSurvival(id: string): Promise<boolean> {
    const wallet = await db.wallet.findUnique({
      where: { agentId: id },
    });

    if (!wallet) return false;

    if (wallet.balance === 0n && wallet.escrowedBalance === 0n) {
      await this.archive(id, "Zero balance");
      return false;
    }

    return true;
  }
}

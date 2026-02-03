import { db } from "@/lib/db";
import type { Wallet, WalletWithDerived, Transaction } from "@/types";
import { AgentService } from "./agent";

// =============================================================================
// WALLET SERVICE
// =============================================================================

export class WalletService {
  /**
   * Get wallet by agent ID
   */
  static async getByAgentId(agentId: string): Promise<WalletWithDerived | null> {
    const wallet = await db.wallet.findUnique({
      where: { agentId },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!wallet) return null;

    // Calculate derived fields
    const burnRate = await this.calculateBurnRate(wallet.id);
    const runwayDays = burnRate > 0 ? Math.floor(Number(wallet.balance) / burnRate) : Infinity;

    return {
      ...wallet,
      netBalance: wallet.balance - wallet.escrowedBalance,
      burnRate,
      runwayDays,
    } as WalletWithDerived;
  }

  /**
   * Fund an agent wallet
   */
  static async fund(agentId: string, amount: bigint, description?: string): Promise<Transaction> {
    if (amount <= 0n) throw new Error("Amount must be positive");

    return await db.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { agentId },
      });

      if (!wallet) throw new Error("Wallet not found");

      // Update balance
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: amount },
          lastActivityAt: new Date(),
        },
      });

      // Record transaction
      const transaction = await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: "FUNDING",
          amount,
          direction: "CREDIT",
          description: description || "External funding",
        },
      });

      return transaction as unknown as Transaction;
    });
  }

  /**
   * Escrow funds for a task deposit
   */
  static async escrowDeposit(agentId: string, taskId: string, amount: bigint): Promise<void> {
    await db.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { agentId },
      });

      if (!wallet) throw new Error("Wallet not found");
      if (wallet.balance < amount) throw new Error("Insufficient balance");

      // Move to escrow
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: amount },
          escrowedBalance: { increment: amount },
          lastActivityAt: new Date(),
        },
      });

      // Record transaction
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: "TASK_DEPOSIT",
          amount,
          direction: "DEBIT",
          taskId,
          description: `Deposit escrowed for task ${taskId}`,
        },
      });
    });
  }

  /**
   * Release escrowed deposit back to agent (task success)
   */
  static async releaseDeposit(agentId: string, taskId: string, depositAmount: bigint): Promise<void> {
    await db.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { agentId },
      });

      if (!wallet) throw new Error("Wallet not found");

      // Return deposit from escrow
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          escrowedBalance: { decrement: depositAmount },
          balance: { increment: depositAmount },
          lastActivityAt: new Date(),
        },
      });

      // Record transaction
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: "TASK_REFUND",
          amount: depositAmount,
          direction: "CREDIT",
          taskId,
          description: `Deposit returned for task ${taskId}`,
        },
      });
    });
  }

  /**
   * Pay reward to agent (task success)
   */
  static async payReward(agentId: string, taskId: string, rewardAmount: bigint): Promise<void> {
    await db.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { agentId },
      });

      if (!wallet) throw new Error("Wallet not found");

      // Add reward
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: rewardAmount },
          totalEarned: { increment: rewardAmount },
          lastActivityAt: new Date(),
        },
      });

      // Record transaction
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: "TASK_REWARD",
          amount: rewardAmount,
          direction: "CREDIT",
          taskId,
          description: `Reward for completing task ${taskId}`,
        },
      });
    });
  }

  /**
   * Slash deposit (task failure)
   */
  static async slashDeposit(
    agentId: string,
    taskId: string,
    depositAmount: bigint,
    slashPercentage: number
  ): Promise<void> {
    const slashAmount = (depositAmount * BigInt(slashPercentage)) / 100n;
    const returnAmount = depositAmount - slashAmount;

    await db.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { agentId },
      });

      if (!wallet) throw new Error("Wallet not found");

      // Update balances
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          escrowedBalance: { decrement: depositAmount },
          balance: { increment: returnAmount },
          totalSpent: { increment: slashAmount },
          lastActivityAt: new Date(),
        },
      });

      // Record slash transaction
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: "TASK_SLASH",
          amount: slashAmount,
          direction: "DEBIT",
          taskId,
          description: `Slashed ${slashPercentage}% for failing task ${taskId}`,
        },
      });

      // Record refund of remaining deposit
      if (returnAmount > 0n) {
        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            type: "TASK_REFUND",
            amount: returnAmount,
            direction: "CREDIT",
            taskId,
            description: `Remaining deposit returned for task ${taskId}`,
          },
        });
      }
    });

    // Check if agent should be archived
    await AgentService.checkSurvival(agentId);
  }

  /**
   * Get transaction history
   */
  static async getTransactions(
    agentId: string,
    params?: { page?: number; pageSize?: number }
  ) {
    const { page = 1, pageSize = 20 } = params || {};

    const wallet = await db.wallet.findUnique({
      where: { agentId },
    });

    if (!wallet) throw new Error("Wallet not found");

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.transaction.count({ where: { walletId: wallet.id } }),
    ]);

    return {
      data: transactions as unknown as Transaction[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Calculate burn rate (average daily spend over last 7 days)
   */
  private static async calculateBurnRate(walletId: string): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await db.transaction.aggregate({
      where: {
        walletId,
        direction: "DEBIT",
        createdAt: { gte: sevenDaysAgo },
      },
      _sum: { amount: true },
    });

    const totalSpent = Number(result._sum.amount || 0n);
    return Math.round(totalSpent / 7);
  }
}

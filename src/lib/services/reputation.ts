import { db } from "@/lib/db";
import type { ReputationScore, ReputationTier, ReputationEvent } from "@/types";
import { REPUTATION_CONFIG } from "@/lib/constants";
import { getTierFromScore } from "@/lib/utils";

// =============================================================================
// REPUTATION SERVICE
// =============================================================================

export class ReputationService {
  /**
   * Get reputation by agent ID
   */
  static async getByAgentId(agentId: string): Promise<ReputationScore | null> {
    const rep = await db.reputationScore.findUnique({
      where: { agentId },
    });

    return rep as unknown as ReputationScore | null;
  }

  /**
   * Get reputation history (events)
   */
  static async getHistory(
    agentId: string,
    params?: { page?: number; pageSize?: number }
  ) {
    const { page = 1, pageSize = 20 } = params || {};

    const [events, total] = await Promise.all([
      db.reputationEvent.findMany({
        where: { agentId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.reputationEvent.count({ where: { agentId } }),
    ]);

    return {
      data: events as unknown as ReputationEvent[],
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Record task success
   */
  static async recordTaskSuccess(
    agentId: string,
    taskId: string,
    difficulty: number
  ): Promise<void> {
    await db.$transaction(async (tx) => {
      const rep = await tx.reputationScore.findUnique({
        where: { agentId },
      });

      if (!rep) throw new Error("Reputation not found");

      // Calculate delta
      const baseDelta = REPUTATION_CONFIG.taskSuccess.base;
      const multiplier =
        REPUTATION_CONFIG.taskSuccess.difficultyMultipliers[
          difficulty as keyof typeof REPUTATION_CONFIG.taskSuccess.difficultyMultipliers
        ] || 1;
      let delta = Math.round(baseDelta * multiplier);

      // Streak bonus
      const newStreak = rep.currentStreak + 1;
      let streakBonus = 0;
      if (newStreak % REPUTATION_CONFIG.streakInterval === 0) {
        streakBonus = REPUTATION_CONFIG.streakBonus;
        delta += streakBonus;
      }

      // Calculate new scores
      const newReliability = Math.min(1000, rep.reliability + delta);
      const newOverall = this.calculateOverall(newReliability, rep.quality, rep.speed);
      const newTier = getTierFromScore(newOverall);

      // Update reputation
      await tx.reputationScore.update({
        where: { agentId },
        data: {
          reliability: newReliability,
          overall: newOverall,
          tier: newTier,
          tasksCompleted: { increment: 1 },
          totalTasksAttempted: { increment: 1 },
          currentStreak: newStreak,
          longestStreak: Math.max(rep.longestStreak, newStreak),
          lastTaskAt: new Date(),
          lastUpdatedAt: new Date(),
        },
      });

      // Log event
      await tx.reputationEvent.create({
        data: {
          agentId,
          eventType: "TASK_SUCCESS",
          delta,
          reason: `Completed ${this.getDifficultyLabel(difficulty)} task`,
          taskId,
          scoreBefore: rep.overall,
          scoreAfter: newOverall,
        },
      });

      // Log streak bonus separately
      if (streakBonus > 0) {
        await tx.reputationEvent.create({
          data: {
            agentId,
            eventType: "BONUS_STREAK",
            delta: streakBonus,
            reason: `${newStreak}-task success streak`,
            taskId,
            scoreBefore: newOverall - streakBonus,
            scoreAfter: newOverall,
          },
        });
      }
    });
  }

  /**
   * Record task failure
   */
  static async recordTaskFailure(
    agentId: string,
    taskId: string,
    difficulty: number
  ): Promise<void> {
    await db.$transaction(async (tx) => {
      const rep = await tx.reputationScore.findUnique({
        where: { agentId },
      });

      if (!rep) throw new Error("Reputation not found");

      // Calculate delta
      const baseDelta = REPUTATION_CONFIG.taskFailure.base;
      const multiplier =
        REPUTATION_CONFIG.taskFailure.difficultyMultipliers[
          difficulty as keyof typeof REPUTATION_CONFIG.taskFailure.difficultyMultipliers
        ] || 1;
      const delta = Math.round(baseDelta * multiplier);

      // Calculate new scores
      const newReliability = Math.max(0, rep.reliability + delta); // delta is negative
      const newOverall = this.calculateOverall(newReliability, rep.quality, rep.speed);
      const newTier = getTierFromScore(newOverall);

      // Update reputation (streak resets)
      await tx.reputationScore.update({
        where: { agentId },
        data: {
          reliability: newReliability,
          overall: newOverall,
          tier: newTier,
          tasksFailed: { increment: 1 },
          totalTasksAttempted: { increment: 1 },
          currentStreak: 0, // Reset streak
          lastTaskAt: new Date(),
          lastUpdatedAt: new Date(),
        },
      });

      // Log event
      await tx.reputationEvent.create({
        data: {
          agentId,
          eventType: "TASK_FAILURE",
          delta,
          reason: `Failed ${this.getDifficultyLabel(difficulty)} task`,
          taskId,
          scoreBefore: rep.overall,
          scoreAfter: newOverall,
        },
      });
    });
  }

  /**
   * Record task timeout
   */
  static async recordTaskTimeout(agentId: string, taskId: string): Promise<void> {
    await db.$transaction(async (tx) => {
      const rep = await tx.reputationScore.findUnique({
        where: { agentId },
      });

      if (!rep) throw new Error("Reputation not found");

      const delta = REPUTATION_CONFIG.taskTimeout;
      const newReliability = Math.max(0, rep.reliability + delta);
      const newOverall = this.calculateOverall(newReliability, rep.quality, rep.speed);
      const newTier = getTierFromScore(newOverall);

      await tx.reputationScore.update({
        where: { agentId },
        data: {
          reliability: newReliability,
          overall: newOverall,
          tier: newTier,
          tasksFailed: { increment: 1 },
          totalTasksAttempted: { increment: 1 },
          currentStreak: 0,
          lastTaskAt: new Date(),
          lastUpdatedAt: new Date(),
        },
      });

      await tx.reputationEvent.create({
        data: {
          agentId,
          eventType: "TASK_TIMEOUT",
          delta,
          reason: "Task execution window expired",
          taskId,
          scoreBefore: rep.overall,
          scoreAfter: newOverall,
        },
      });
    });
  }

  /**
   * Apply inactivity decay (run daily via cron)
   */
  static async applyInactivityDecay(): Promise<number> {
    const cutoff = new Date(
      Date.now() - REPUTATION_CONFIG.inactivityThresholdDays * 24 * 60 * 60 * 1000
    );

    const inactiveAgents = await db.reputationScore.findMany({
      where: {
        lastTaskAt: { lt: cutoff },
        overall: { gt: REPUTATION_CONFIG.decayFloor },
      },
    });

    let decayedCount = 0;

    for (const rep of inactiveAgents) {
      const decayAmount = Math.min(
        REPUTATION_CONFIG.inactivityDecay,
        rep.overall - REPUTATION_CONFIG.decayFloor
      );

      if (decayAmount <= 0) continue;

      const newOverall = rep.overall - decayAmount;
      const newTier = getTierFromScore(newOverall);

      await db.$transaction(async (tx) => {
        await tx.reputationScore.update({
          where: { agentId: rep.agentId },
          data: {
            reliability: Math.max(REPUTATION_CONFIG.decayFloor, rep.reliability - decayAmount),
            overall: newOverall,
            tier: newTier,
            lastUpdatedAt: new Date(),
          },
        });

        await tx.reputationEvent.create({
          data: {
            agentId: rep.agentId,
            eventType: "INACTIVITY_DECAY",
            delta: -decayAmount,
            reason: `No activity for ${REPUTATION_CONFIG.inactivityThresholdDays}+ days`,
            scoreBefore: rep.overall,
            scoreAfter: newOverall,
          },
        });
      });

      decayedCount++;
    }

    return decayedCount;
  }

  /**
   * Calculate overall score from components
   */
  private static calculateOverall(
    reliability: number,
    quality: number,
    speed: number
  ): number {
    const { weights } = REPUTATION_CONFIG;
    return Math.round(
      reliability * weights.reliability +
        quality * weights.quality +
        speed * weights.speed
    );
  }

  /**
   * Get difficulty label
   */
  private static getDifficultyLabel(difficulty: number): string {
    const labels: Record<number, string> = {
      1: "TRIVIAL",
      2: "EASY",
      3: "MEDIUM",
      4: "HARD",
      5: "EXPERT",
    };
    return labels[difficulty] || "UNKNOWN";
  }
}

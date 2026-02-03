import { db } from "@/lib/db";

// =============================================================================
// ACTIVITY SERVICE
// =============================================================================

export type ActivityEventType =
  | "task_completed"
  | "task_failed"
  | "agent_deployed"
  | "agent_archived"
  | "bid_placed"
  | "bid_accepted"
  | "tier_up"
  | "tier_down"
  | "task_created"
  | "streak_bonus"
  | "funding_received";

export interface ActivityEventData {
  // Common fields
  agentId?: string;
  agentName?: string;
  taskId?: string;
  taskTitle?: string;

  // Type-specific fields
  reward?: string;
  slashed?: string;
  amount?: string;
  role?: string;
  funding?: string;
  category?: string;
  from?: string;
  to?: string;
  streak?: number;
  bonus?: string;
  reason?: string;
  lifetime?: string;
  poster?: string;
}

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  data: ActivityEventData;
  createdAt: Date;
}

export class ActivityService {
  /**
   * Log a new activity event
   */
  static async log(type: ActivityEventType, data: ActivityEventData): Promise<ActivityEvent> {
    const event = await db.activityEvent.create({
      data: {
        type,
        data: data as any,
      },
    });

    return event as unknown as ActivityEvent;
  }

  /**
   * Get recent activity events
   */
  static async getRecent(limit: number = 50): Promise<ActivityEvent[]> {
    const events = await db.activityEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return events as unknown as ActivityEvent[];
  }

  /**
   * Get events by type
   */
  static async getByType(type: ActivityEventType, limit: number = 20): Promise<ActivityEvent[]> {
    const events = await db.activityEvent.findMany({
      where: { type },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return events as unknown as ActivityEvent[];
  }

  /**
   * Clean up old events (older than specified hours)
   */
  static async cleanup(olderThanHours: number = 24): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    const result = await db.activityEvent.deleteMany({
      where: {
        createdAt: { lt: cutoff },
      },
    });

    return result.count;
  }

  // ==========================================================================
  // Convenience methods for specific event types
  // ==========================================================================

  static async logTaskCompleted(
    agentId: string,
    agentName: string,
    taskId: string,
    taskTitle: string,
    reward: bigint
  ) {
    return this.log("task_completed", {
      agentId,
      agentName,
      taskId,
      taskTitle,
      reward: `${reward} CLAW`,
    });
  }

  static async logTaskFailed(
    agentId: string,
    agentName: string,
    taskId: string,
    taskTitle: string,
    slashed: bigint
  ) {
    return this.log("task_failed", {
      agentId,
      agentName,
      taskId,
      taskTitle,
      slashed: `${slashed} CLAW`,
    });
  }

  static async logAgentDeployed(
    agentId: string,
    agentName: string,
    role: string,
    funding: bigint
  ) {
    return this.log("agent_deployed", {
      agentId,
      agentName,
      role,
      funding: `${funding} CLAW`,
    });
  }

  static async logAgentArchived(
    agentId: string,
    agentName: string,
    reason: string,
    lifetimeDays: number
  ) {
    return this.log("agent_archived", {
      agentId,
      agentName,
      reason,
      lifetime: `${lifetimeDays} days`,
    });
  }

  static async logBidPlaced(
    agentId: string,
    agentName: string,
    taskId: string,
    taskTitle: string,
    amount: bigint
  ) {
    return this.log("bid_placed", {
      agentId,
      agentName,
      taskId,
      taskTitle,
      amount: `${amount} CLAW`,
    });
  }

  static async logBidAccepted(
    agentId: string,
    agentName: string,
    taskId: string,
    taskTitle: string,
    amount: bigint
  ) {
    return this.log("bid_accepted", {
      agentId,
      agentName,
      taskId,
      taskTitle,
      amount: `${amount} CLAW`,
    });
  }

  static async logTierChange(
    agentId: string,
    agentName: string,
    from: string,
    to: string,
    direction: "up" | "down"
  ) {
    return this.log(direction === "up" ? "tier_up" : "tier_down", {
      agentId,
      agentName,
      from,
      to,
    });
  }

  static async logTaskCreated(
    posterId: string,
    posterName: string,
    taskId: string,
    taskTitle: string,
    category: string,
    reward: bigint
  ) {
    return this.log("task_created", {
      agentId: posterId,
      poster: posterName,
      taskId,
      taskTitle,
      category,
      reward: `${reward} CLAW`,
    });
  }

  static async logStreakBonus(
    agentId: string,
    agentName: string,
    streak: number,
    bonus: number
  ) {
    return this.log("streak_bonus", {
      agentId,
      agentName,
      streak,
      bonus: `+${bonus} REP`,
    });
  }
}

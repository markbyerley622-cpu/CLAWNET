// =============================================================================
// SIMULATION SCHEDULER - Timing and Pacing Control
// =============================================================================

// Timing constants (in milliseconds) - Set to instant/fast for real-time updates
export const TIMING = {
  // Agent spawn - instant (no delay, manual spawning)
  SYNTHETIC_AGENT_INTERVAL: 0,

  // Task batch generation - every 5 seconds
  TASK_BATCH_INTERVAL_MIN: 5 * 1000,
  TASK_BATCH_INTERVAL_MAX: 10 * 1000,

  // Leaderboard cache update interval - every 5 seconds
  LEADERBOARD_UPDATE_INTERVAL: 5 * 1000,

  // Task completion processing interval - every 5 seconds
  TASK_COMPLETION_INTERVAL: 5 * 1000,

  // Activity cleanup interval (1 hour)
  ACTIVITY_CLEANUP_INTERVAL: 60 * 60 * 1000,

  // Minimum time between simulation ticks - 3 seconds
  MIN_TICK_INTERVAL: 3 * 1000,

  // Pause duration when hitting growth cap - disabled
  GROWTH_PAUSE_DURATION: 0,
};

// Growth caps - increased for more activity
export const GROWTH_CAPS = {
  // First pause at 1000 agents (effectively disabled)
  FIRST_CAP: 1000,
  // Final cap at 5000 agents
  FINAL_CAP: 5000,
  // Pause disabled
  PAUSE_AT_FIRST_CAP: 0,
};

// Simulation limits - increased for more activity
export const LIMITS = {
  // Maximum synthetic agents per tick
  MAX_AGENTS_PER_TICK: 5,

  // Maximum tasks to generate per batch
  MAX_TASKS_PER_BATCH: 10,

  // Maximum task completions to process per tick
  MAX_COMPLETIONS_PER_TICK: 20,

  // Maximum active synthetic agents (final cap)
  MAX_SYNTHETIC_AGENTS: GROWTH_CAPS.FINAL_CAP,

  // Maximum open tasks
  MAX_OPEN_TASKS: 100,
};

/**
 * Generate random interval within a range
 */
export function randomInterval(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Get next task batch interval
 */
export function getNextTaskBatchInterval(): number {
  return randomInterval(
    TIMING.TASK_BATCH_INTERVAL_MIN,
    TIMING.TASK_BATCH_INTERVAL_MAX
  );
}

/**
 * Check if enough time has passed since last event
 */
export function shouldTrigger(lastEventTime: Date | null, intervalMs: number): boolean {
  if (!lastEventTime) return true;
  return Date.now() - lastEventTime.getTime() >= intervalMs;
}

/**
 * Schedule item for the simulation queue
 */
export interface ScheduledItem {
  type: "agent_spawn" | "task_batch" | "task_completion" | "leaderboard_update" | "cleanup";
  scheduledAt: Date;
  data?: any;
}

/**
 * Create a priority queue for scheduled items
 */
export class SimulationQueue {
  private items: ScheduledItem[] = [];

  add(item: ScheduledItem): void {
    this.items.push(item);
    this.items.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
  }

  peek(): ScheduledItem | undefined {
    return this.items[0];
  }

  pop(): ScheduledItem | undefined {
    return this.items.shift();
  }

  getDue(): ScheduledItem[] {
    const now = Date.now();
    const due: ScheduledItem[] = [];

    while (this.items.length > 0 && this.items[0].scheduledAt.getTime() <= now) {
      due.push(this.items.shift()!);
    }

    return due;
  }

  clear(): void {
    this.items = [];
  }

  size(): number {
    return this.items.length;
  }
}

/**
 * Pacing controller to prevent runaway simulation
 */
export class PacingController {
  private lastTickTime: number = 0;
  private tickCount: number = 0;

  canTick(): boolean {
    const now = Date.now();
    return now - this.lastTickTime >= TIMING.MIN_TICK_INTERVAL;
  }

  recordTick(): void {
    this.lastTickTime = Date.now();
    this.tickCount++;
  }

  getTickCount(): number {
    return this.tickCount;
  }

  getLastTickTime(): number {
    return this.lastTickTime;
  }

  reset(): void {
    this.lastTickTime = 0;
    this.tickCount = 0;
  }
}

/**
 * Check if agent spawning should be paused based on growth caps
 * Returns { canSpawn, reason }
 */
export function checkGrowthCap(
  currentAgentCount: number,
  firstCapReachedAt: Date | null
): { canSpawn: boolean; reason: string } {
  // Final cap - no more agents
  if (currentAgentCount >= GROWTH_CAPS.FINAL_CAP) {
    return { canSpawn: false, reason: `Final cap reached (${GROWTH_CAPS.FINAL_CAP} agents)` };
  }

  // First cap - pause for 15 minutes
  if (currentAgentCount >= GROWTH_CAPS.FIRST_CAP) {
    if (!firstCapReachedAt) {
      // Just hit the cap, start pause
      return { canSpawn: false, reason: `First cap reached (${GROWTH_CAPS.FIRST_CAP} agents) - starting pause` };
    }

    const pauseElapsed = Date.now() - firstCapReachedAt.getTime();
    if (pauseElapsed < GROWTH_CAPS.PAUSE_AT_FIRST_CAP) {
      const remainingMins = Math.ceil((GROWTH_CAPS.PAUSE_AT_FIRST_CAP - pauseElapsed) / 60000);
      return { canSpawn: false, reason: `Paused at ${GROWTH_CAPS.FIRST_CAP} agents (${remainingMins}min remaining)` };
    }
  }

  return { canSpawn: true, reason: "Growth allowed" };
}

/**
 * Calculate agent spawn probability based on current population
 * Returns probability of spawning a new agent (0-1)
 */
export function calculateSpawnProbability(currentAgentCount: number): number {
  if (currentAgentCount >= LIMITS.MAX_SYNTHETIC_AGENTS) return 0;

  // Higher probability when population is low
  const populationRatio = currentAgentCount / LIMITS.MAX_SYNTHETIC_AGENTS;

  // Exponential decay: more agents = less likely to spawn
  return Math.max(0, 1 - Math.pow(populationRatio, 0.5));
}

/**
 * Calculate task generation count based on current open tasks
 */
export function calculateTaskBatchSize(currentOpenTasks: number): number {
  if (currentOpenTasks >= LIMITS.MAX_OPEN_TASKS) return 0;

  const openRatio = currentOpenTasks / LIMITS.MAX_OPEN_TASKS;

  // Generate more tasks when fewer are available
  const targetTasks = Math.ceil(LIMITS.MAX_TASKS_PER_BATCH * (1 - openRatio));

  return Math.min(targetTasks, LIMITS.MAX_OPEN_TASKS - currentOpenTasks);
}

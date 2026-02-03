import { db, isShuttingDown } from "@/lib/db";

// =============================================================================
// SIMULATION STATE - Persistent state management
// =============================================================================

export interface SimulationStateData {
  id: string;
  lastAgentSpawnAt: Date | null;
  lastTaskBatchAt: Date | null;
  lastLeaderboardUpdate: Date | null;
  firstCapReachedAt: Date | null;
  isPaused: boolean;
  tickCount: number;
  updatedAt: Date;
}

const SINGLETON_ID = "singleton";

// In-memory tick lock to prevent concurrent ticks
let tickLock = false;
let lastTickStartTime = 0;
const MIN_TICK_INTERVAL_MS = 2000; // Minimum 2 seconds between ticks

export class SimulationStateService {
  /**
   * Acquire tick lock - prevents concurrent simulation ticks
   * Returns true if lock acquired, false if already locked or too soon
   */
  static acquireTickLock(): boolean {
    if (isShuttingDown()) return false;
    if (tickLock) return false;

    const now = Date.now();
    if (now - lastTickStartTime < MIN_TICK_INTERVAL_MS) {
      return false;
    }

    tickLock = true;
    lastTickStartTime = now;
    return true;
  }

  /**
   * Release tick lock
   */
  static releaseTickLock(): void {
    tickLock = false;
  }

  /**
   * Check if tick is currently in progress
   */
  static isTickInProgress(): boolean {
    return tickLock;
  }

  /**
   * Get or create the simulation state singleton
   */
  static async get(): Promise<SimulationStateData> {
    let state = await db.simulationState.findUnique({
      where: { id: SINGLETON_ID },
    });

    if (!state) {
      state = await db.simulationState.create({
        data: {
          id: SINGLETON_ID,
          isPaused: false,
          tickCount: 0,
        },
      });
    }

    return state as SimulationStateData;
  }

  /**
   * Update simulation state
   */
  static async update(data: Partial<Omit<SimulationStateData, "id" | "updatedAt">>): Promise<SimulationStateData> {
    const state = await db.simulationState.upsert({
      where: { id: SINGLETON_ID },
      create: {
        id: SINGLETON_ID,
        ...data,
      },
      update: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return state as SimulationStateData;
  }

  /**
   * Record that an agent was spawned
   */
  static async recordAgentSpawn(): Promise<void> {
    await this.update({ lastAgentSpawnAt: new Date() });
  }

  /**
   * Record that a task batch was generated
   */
  static async recordTaskBatch(): Promise<void> {
    await this.update({ lastTaskBatchAt: new Date() });
  }

  /**
   * Record leaderboard update
   */
  static async recordLeaderboardUpdate(): Promise<void> {
    await this.update({ lastLeaderboardUpdate: new Date() });
  }

  /**
   * Record when first growth cap (200 agents) is reached
   */
  static async recordFirstCapReached(): Promise<void> {
    // Use a transaction to ensure atomicity
    await db.$transaction(async (tx) => {
      const state = await tx.simulationState.findUnique({
        where: { id: SINGLETON_ID },
      });

      if (state && !state.firstCapReachedAt) {
        await tx.simulationState.update({
          where: { id: SINGLETON_ID },
          data: {
            firstCapReachedAt: new Date(),
            updatedAt: new Date(),
          },
        });
        console.log("[SIMULATION] First growth cap reached - starting pause");
      }
    });
  }

  /**
   * Increment tick count atomically using raw SQL
   */
  static async incrementTick(): Promise<number> {
    // Use raw SQL for atomic increment to avoid race conditions
    const result = await db.$executeRaw`
      UPDATE "SimulationState"
      SET "tickCount" = "tickCount" + 1, "updatedAt" = NOW()
      WHERE id = ${SINGLETON_ID}
    `;

    if (result === 0) {
      // State doesn't exist, create it
      await db.simulationState.create({
        data: {
          id: SINGLETON_ID,
          isPaused: false,
          tickCount: 1,
        },
      });
      return 1;
    }

    // Fetch the new value
    const state = await db.simulationState.findUnique({
      where: { id: SINGLETON_ID },
      select: { tickCount: true },
    });

    return state?.tickCount ?? 1;
  }

  /**
   * Pause the simulation
   */
  static async pause(): Promise<void> {
    await this.update({ isPaused: true });
  }

  /**
   * Resume the simulation
   */
  static async resume(): Promise<void> {
    await this.update({ isPaused: false });
  }

  /**
   * Check if simulation is paused
   */
  static async isPaused(): Promise<boolean> {
    const state = await this.get();
    return state.isPaused;
  }

  /**
   * Reset simulation state
   */
  static async reset(): Promise<void> {
    tickLock = false;
    lastTickStartTime = 0;
    await this.update({
      lastAgentSpawnAt: null,
      lastTaskBatchAt: null,
      lastLeaderboardUpdate: null,
      firstCapReachedAt: null,
      isPaused: false,
      tickCount: 0,
    });
  }
}

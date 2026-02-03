import { db } from "@/lib/db";

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

export class SimulationStateService {
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
    const state = await this.get();
    if (!state.firstCapReachedAt) {
      await this.update({ firstCapReachedAt: new Date() });
      console.log("[SIMULATION] First growth cap (200 agents) reached - starting 15 min pause");
    }
  }

  /**
   * Increment tick count
   */
  static async incrementTick(): Promise<number> {
    const state = await this.get();
    await this.update({ tickCount: state.tickCount + 1 });
    return state.tickCount + 1;
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

// =============================================================================
// DETERMINISTIC OUTCOME CALCULATOR
// =============================================================================

/**
 * Simple seeded random number generator (Mulberry32)
 * Provides deterministic randomness for reproducible simulations
 */
function seededRandom(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Calculate success probability for a task
 *
 * Formula: successChance = (reputation/1000) * (1 - difficulty/10) + baseChance
 *
 * @param agentReputation - Agent's overall reputation score (0-1000)
 * @param taskDifficulty - Task difficulty (1-5)
 * @param baseChance - Base success chance (default 0.3 = 30%)
 * @returns Success probability (0-1)
 */
export function calculateSuccessProbability(
  agentReputation: number,
  taskDifficulty: number,
  baseChance: number = 0.3
): number {
  // Normalize reputation (0-1)
  const normalizedRep = Math.min(Math.max(agentReputation, 0), 1000) / 1000;

  // Normalize difficulty impact (higher difficulty = lower multiplier)
  const difficultyMultiplier = 1 - taskDifficulty / 10;

  // Calculate success probability
  const probability = normalizedRep * difficultyMultiplier + baseChance;

  // Clamp between 0.1 and 0.98 (never guaranteed success or failure)
  return Math.min(Math.max(probability, 0.1), 0.98);
}

/**
 * Determine task outcome using deterministic seeded random
 *
 * @param agentReputation - Agent's overall reputation score (0-1000)
 * @param taskDifficulty - Task difficulty (1-5)
 * @param seed - Random seed for determinism
 * @returns True if task succeeds, false otherwise
 */
export function calculateTaskOutcome(
  agentReputation: number,
  taskDifficulty: number,
  seed: number
): boolean {
  const probability = calculateSuccessProbability(agentReputation, taskDifficulty);
  const rand = seededRandom(seed);
  return rand() < probability;
}

/**
 * Calculate quality score for a completed task
 * Higher reputation agents tend to produce higher quality output
 *
 * @param agentReputation - Agent's overall reputation score (0-1000)
 * @param taskDifficulty - Task difficulty (1-5)
 * @param seed - Random seed for determinism
 * @returns Quality score (0-100)
 */
export function calculateQualityScore(
  agentReputation: number,
  taskDifficulty: number,
  seed: number
): number {
  const rand = seededRandom(seed);

  // Base quality influenced by reputation
  const baseQuality = 50 + (agentReputation / 1000) * 40;

  // Variance based on difficulty (harder tasks have more variance)
  const variance = taskDifficulty * 5;

  // Random adjustment within variance range
  const adjustment = (rand() - 0.5) * variance * 2;

  return Math.min(Math.max(Math.round(baseQuality + adjustment), 0), 100);
}

/**
 * Calculate completion time factor
 * Higher reputation agents tend to complete faster
 *
 * @param agentSpeed - Agent's speed score (0-1000)
 * @param taskDifficulty - Task difficulty (1-5)
 * @param seed - Random seed for determinism
 * @returns Time factor (0.5-2.0, where 1.0 is expected time)
 */
export function calculateCompletionTimeFactor(
  agentSpeed: number,
  taskDifficulty: number,
  seed: number
): number {
  const rand = seededRandom(seed);

  // Base time factor (higher speed = faster)
  const baseFactor = 1.5 - (agentSpeed / 1000) * 0.7;

  // Difficulty adds variability
  const difficultyVariance = (taskDifficulty / 5) * 0.3;

  // Random adjustment
  const adjustment = (rand() - 0.5) * difficultyVariance * 2;

  return Math.min(Math.max(baseFactor + adjustment, 0.5), 2.0);
}

/**
 * Calculate reputation delta for task completion
 *
 * @param success - Whether task was completed successfully
 * @param taskDifficulty - Task difficulty (1-5)
 * @param qualityScore - Quality of output (0-100)
 * @param currentStreak - Current success streak
 * @returns Reputation delta (can be negative for failures)
 */
export function calculateReputationDelta(
  success: boolean,
  taskDifficulty: number,
  qualityScore: number,
  currentStreak: number
): number {
  if (!success) {
    // Failures hurt more for higher difficulty tasks
    return -(10 + taskDifficulty * 5);
  }

  // Base points for success
  let delta = 5 + taskDifficulty * 3;

  // Quality bonus
  if (qualityScore >= 90) {
    delta += 5;
  } else if (qualityScore >= 75) {
    delta += 2;
  }

  // Streak bonus (every 5 tasks)
  if (currentStreak > 0 && currentStreak % 5 === 0) {
    delta += 10;
  }

  return delta;
}

/**
 * Simulate task execution timing
 * Returns simulated duration in milliseconds
 *
 * @param executionWindowMinutes - Task execution window in minutes
 * @param timeFactor - Completion time factor
 * @returns Duration in milliseconds
 */
export function simulateExecutionTime(
  executionWindowMinutes: number,
  timeFactor: number
): number {
  // Simulate completing between 20-80% of execution window
  const baseCompletionRatio = 0.2 + Math.random() * 0.6;
  const adjustedRatio = baseCompletionRatio * timeFactor;

  return Math.floor(executionWindowMinutes * adjustedRatio * 60 * 1000);
}

/**
 * Generate outcome seed from task and agent IDs
 * Ensures deterministic outcomes for the same task-agent pair
 */
export function generateOutcomeSeed(taskId: string, agentId: string, timestamp: number): number {
  let hash = 0;
  const combined = `${taskId}-${agentId}-${timestamp}`;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

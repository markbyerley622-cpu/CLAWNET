// =============================================================================
// AGENT NAME GENERATOR
// =============================================================================

// Fixed seed lists for reproducible names
const PREFIXES = [
  "ALPHA", "BETA", "GAMMA", "DELTA", "EPSILON",
  "ZETA", "ETA", "THETA", "IOTA", "KAPPA",
  "SIGMA", "TAU", "OMEGA", "PRIME", "NEXUS",
  "CYBER", "NEURAL", "QUANTUM", "SYNTH", "PULSE",
  "VECTOR", "MATRIX", "CIPHER", "FLUX", "APEX",
  "CORE", "NODE", "SPARK", "VOLT", "ZERO",
];

const SUFFIXES = [
  "X1", "X2", "X3", "X7", "X9",
  "A1", "B2", "C3", "D4", "E5",
  "7K", "8M", "9N", "0P", "1Q",
  "2R", "3S", "4T", "5U", "6V",
];

/**
 * Simple seeded random number generator (Mulberry32)
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
 * Generate a deterministic agent name based on a seed
 */
export function generateAgentNameFromSeed(seed: number): string {
  const rand = seededRandom(seed);

  const prefixIndex = Math.floor(rand() * PREFIXES.length);
  const suffixIndex = Math.floor(rand() * SUFFIXES.length);

  return `${PREFIXES[prefixIndex]}-${SUFFIXES[suffixIndex]}`;
}

/**
 * Generate a unique agent name (format: AGENT-XXXX)
 */
export function generateUniqueAgentName(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars (0,O,1,I)
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `AGENT-${suffix}`;
}

/**
 * Generate a batch of unique agent names
 */
export function generateAgentNameBatch(count: number, startSeed: number = Date.now()): string[] {
  const names: string[] = [];
  const usedNames = new Set<string>();

  for (let i = 0; i < count; i++) {
    let name: string;
    let attempts = 0;

    do {
      name = generateAgentNameFromSeed(startSeed + i + attempts * 1000);
      attempts++;
    } while (usedNames.has(name) && attempts < 100);

    usedNames.add(name);
    names.push(name);
  }

  return names;
}

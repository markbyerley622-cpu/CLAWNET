import type { TaskCategory, RiskRating } from "@/types";

// =============================================================================
// TASK TEMPLATES AND GENERATION
// =============================================================================

export interface TaskTemplate {
  title: string;
  description: string;
  category: TaskCategory;
  difficultyRange: [number, number]; // min, max (1-5)
  rewardRange: [bigint, bigint]; // min, max
  depositMultiplier: number; // deposit = reward * multiplier
  requiredReputationRange: [number, number];
  executionWindowRange: [number, number]; // minutes
}

// Task templates by category
export const TASK_TEMPLATES: TaskTemplate[] = [
  // COMPUTATION tasks
  {
    title: "Train Classification Model on Dataset",
    description: "Train a classification model on the provided dataset and return accuracy metrics.",
    category: "COMPUTATION",
    difficultyRange: [3, 5],
    rewardRange: [500n, 2000n],
    depositMultiplier: 0.35,
    requiredReputationRange: [400, 700],
    executionWindowRange: [120, 480],
  },
  {
    title: "Process Image Batch with ML Pipeline",
    description: "Apply machine learning pipeline to batch of images for classification and feature extraction.",
    category: "COMPUTATION",
    difficultyRange: [2, 4],
    rewardRange: [200n, 800n],
    depositMultiplier: 0.3,
    requiredReputationRange: [200, 500],
    executionWindowRange: [60, 180],
  },
  {
    title: "Run Monte Carlo Simulation",
    description: "Execute Monte Carlo simulation with specified parameters and return statistical results.",
    category: "COMPUTATION",
    difficultyRange: [3, 4],
    rewardRange: [300n, 1000n],
    depositMultiplier: 0.25,
    requiredReputationRange: [300, 600],
    executionWindowRange: [90, 240],
  },
  {
    title: "Compute Hash Verification Batch",
    description: "Verify integrity of data batch using cryptographic hash functions.",
    category: "COMPUTATION",
    difficultyRange: [1, 2],
    rewardRange: [50n, 150n],
    depositMultiplier: 0.2,
    requiredReputationRange: [0, 200],
    executionWindowRange: [15, 60],
  },
  {
    title: "Optimize Neural Network Hyperparameters",
    description: "Find optimal hyperparameters for given neural network architecture.",
    category: "COMPUTATION",
    difficultyRange: [4, 5],
    rewardRange: [1000n, 3000n],
    depositMultiplier: 0.4,
    requiredReputationRange: [600, 850],
    executionWindowRange: [240, 720],
  },

  // VALIDATION tasks
  {
    title: "Validate JSON Schema Compliance",
    description: "Validate that JSON input conforms to specified JSON Schema (draft-07).",
    category: "VALIDATION",
    difficultyRange: [1, 3],
    rewardRange: [50n, 200n],
    depositMultiplier: 0.25,
    requiredReputationRange: [0, 300],
    executionWindowRange: [15, 60],
  },
  {
    title: "Verify Smart Contract Output",
    description: "Validate smart contract execution results against expected outputs.",
    category: "VALIDATION",
    difficultyRange: [3, 4],
    rewardRange: [300n, 800n],
    depositMultiplier: 0.35,
    requiredReputationRange: [400, 700],
    executionWindowRange: [30, 120],
  },
  {
    title: "Cross-Validate ML Model Predictions",
    description: "Perform k-fold cross-validation on model predictions.",
    category: "VALIDATION",
    difficultyRange: [2, 4],
    rewardRange: [150n, 500n],
    depositMultiplier: 0.3,
    requiredReputationRange: [200, 500],
    executionWindowRange: [60, 180],
  },
  {
    title: "Audit Data Pipeline Integrity",
    description: "Verify data pipeline outputs maintain integrity and consistency.",
    category: "VALIDATION",
    difficultyRange: [2, 3],
    rewardRange: [100n, 300n],
    depositMultiplier: 0.25,
    requiredReputationRange: [200, 400],
    executionWindowRange: [30, 90],
  },

  // ANALYSIS tasks
  {
    title: "Analyze Market Sentiment Data",
    description: "Analyze provided market data and return sentiment scores with confidence intervals.",
    category: "ANALYSIS",
    difficultyRange: [2, 4],
    rewardRange: [200n, 700n],
    depositMultiplier: 0.25,
    requiredReputationRange: [200, 500],
    executionWindowRange: [60, 180],
  },
  {
    title: "Extract Key Insights from Dataset",
    description: "Perform exploratory data analysis and extract actionable insights.",
    category: "ANALYSIS",
    difficultyRange: [2, 3],
    rewardRange: [150n, 400n],
    depositMultiplier: 0.2,
    requiredReputationRange: [200, 400],
    executionWindowRange: [60, 120],
  },
  {
    title: "Perform Anomaly Detection Analysis",
    description: "Identify anomalies and outliers in provided dataset using statistical methods.",
    category: "ANALYSIS",
    difficultyRange: [3, 4],
    rewardRange: [300n, 800n],
    depositMultiplier: 0.3,
    requiredReputationRange: [400, 600],
    executionWindowRange: [90, 240],
  },
  {
    title: "Generate Statistical Report",
    description: "Create comprehensive statistical report from provided data.",
    category: "ANALYSIS",
    difficultyRange: [2, 3],
    rewardRange: [100n, 300n],
    depositMultiplier: 0.2,
    requiredReputationRange: [100, 300],
    executionWindowRange: [45, 120],
  },

  // GENERATION tasks
  {
    title: "Generate Technical Documentation",
    description: "Generate comprehensive technical documentation for provided codebase.",
    category: "GENERATION",
    difficultyRange: [2, 4],
    rewardRange: [150n, 500n],
    depositMultiplier: 0.25,
    requiredReputationRange: [200, 500],
    executionWindowRange: [60, 180],
  },
  {
    title: "Create Synthetic Training Data",
    description: "Generate synthetic training data matching specified distribution and schema.",
    category: "GENERATION",
    difficultyRange: [3, 5],
    rewardRange: [400n, 1200n],
    depositMultiplier: 0.35,
    requiredReputationRange: [400, 700],
    executionWindowRange: [120, 360],
  },
  {
    title: "Generate API Response Mocks",
    description: "Create realistic mock API responses based on schema definitions.",
    category: "GENERATION",
    difficultyRange: [1, 2],
    rewardRange: [50n, 150n],
    depositMultiplier: 0.2,
    requiredReputationRange: [0, 200],
    executionWindowRange: [15, 45],
  },
  {
    title: "Build Test Case Suite",
    description: "Generate comprehensive test cases for specified functionality.",
    category: "GENERATION",
    difficultyRange: [2, 3],
    rewardRange: [100n, 350n],
    depositMultiplier: 0.25,
    requiredReputationRange: [200, 400],
    executionWindowRange: [45, 120],
  },

  // ORCHESTRATION tasks
  {
    title: "Coordinate Multi-Agent Data Pipeline",
    description: "Orchestrate multiple agents to process data pipeline with validation steps.",
    category: "ORCHESTRATION",
    difficultyRange: [4, 5],
    rewardRange: [1500n, 4000n],
    depositMultiplier: 0.4,
    requiredReputationRange: [700, 900],
    executionWindowRange: [240, 720],
  },
  {
    title: "Manage Distributed Task Queue",
    description: "Coordinate task distribution and result aggregation across multiple agents.",
    category: "ORCHESTRATION",
    difficultyRange: [3, 4],
    rewardRange: [600n, 1500n],
    depositMultiplier: 0.35,
    requiredReputationRange: [500, 750],
    executionWindowRange: [120, 360],
  },
  {
    title: "Orchestrate Model Ensemble",
    description: "Coordinate multiple model inferences and aggregate predictions.",
    category: "ORCHESTRATION",
    difficultyRange: [4, 5],
    rewardRange: [800n, 2000n],
    depositMultiplier: 0.35,
    requiredReputationRange: [600, 850],
    executionWindowRange: [180, 480],
  },

  // RESEARCH tasks
  {
    title: "Research Optimal Algorithm Approach",
    description: "Research and recommend optimal algorithm for specified problem domain.",
    category: "RESEARCH",
    difficultyRange: [2, 4],
    rewardRange: [200n, 600n],
    depositMultiplier: 0.2,
    requiredReputationRange: [200, 500],
    executionWindowRange: [120, 360],
  },
  {
    title: "Survey State-of-the-Art Methods",
    description: "Compile survey of current state-of-the-art methods for given task type.",
    category: "RESEARCH",
    difficultyRange: [3, 4],
    rewardRange: [300n, 800n],
    depositMultiplier: 0.2,
    requiredReputationRange: [400, 600],
    executionWindowRange: [180, 480],
  },
  {
    title: "Benchmark Performance Analysis",
    description: "Research and benchmark different approaches for performance comparison.",
    category: "RESEARCH",
    difficultyRange: [2, 3],
    rewardRange: [150n, 400n],
    depositMultiplier: 0.25,
    requiredReputationRange: [200, 400],
    executionWindowRange: [90, 240],
  },
];

/**
 * Generate random value within range
 */
function randomInRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomBigIntInRange(min: bigint, max: bigint): bigint {
  const range = Number(max - min);
  return min + BigInt(Math.floor(Math.random() * range));
}

/**
 * Calculate risk rating based on difficulty and slash percentage
 */
function calculateRiskRating(difficulty: number, slashPercentage: number): RiskRating {
  const riskScore = difficulty * 0.4 + slashPercentage * 0.6;
  if (riskScore <= 15) return "LOW";
  if (riskScore <= 30) return "MEDIUM";
  if (riskScore <= 45) return "HIGH";
  return "CRITICAL";
}

/**
 * Generate a task from a template
 */
export function generateTaskFromTemplate(template: TaskTemplate) {
  const difficulty = randomInRange(template.difficultyRange[0], template.difficultyRange[1]);
  const reward = randomBigIntInRange(template.rewardRange[0], template.rewardRange[1]);
  const depositRequired = BigInt(Math.floor(Number(reward) * template.depositMultiplier));
  const requiredReputation = randomInRange(
    template.requiredReputationRange[0],
    template.requiredReputationRange[1]
  );
  const executionWindowMinutes = randomInRange(
    template.executionWindowRange[0],
    template.executionWindowRange[1]
  );

  // Calculate slash percentage based on difficulty
  const slashPercentage = difficulty <= 2 ? 10 : difficulty <= 3 ? 20 : difficulty <= 4 ? 30 : 50;
  const riskRating = calculateRiskRating(difficulty, slashPercentage);

  // Expiration 1-3 days from now
  const expiresAt = new Date(
    Date.now() + randomInRange(24, 72) * 60 * 60 * 1000
  );

  return {
    title: template.title,
    description: template.description,
    category: template.category,
    difficulty,
    reward,
    depositRequired,
    slashPercentage,
    riskRating,
    requiredReputation,
    executionWindowMinutes,
    expiresAt,
    schema: {
      inputs: [{ name: "input", type: "json", required: true, description: "Task input" }],
      outputs: [{ name: "output", type: "json", required: true, description: "Task output" }],
      examples: [],
    },
    validationLogic: JSON.stringify({ type: "schema", schema: {} }),
  };
}

/**
 * Generate a random task
 */
export function generateRandomTask() {
  const template = TASK_TEMPLATES[Math.floor(Math.random() * TASK_TEMPLATES.length)];
  return generateTaskFromTemplate(template);
}

/**
 * Generate multiple random tasks
 */
export function generateTaskBatch(count: number) {
  const tasks = [];
  for (let i = 0; i < count; i++) {
    tasks.push(generateRandomTask());
  }
  return tasks;
}

/**
 * Generate tasks weighted by category distribution
 */
export function generateWeightedTaskBatch(count: number) {
  // Weighted distribution favoring COMPUTATION and VALIDATION
  const weights: Record<TaskCategory, number> = {
    COMPUTATION: 30,
    VALIDATION: 25,
    ANALYSIS: 20,
    GENERATION: 12,
    ORCHESTRATION: 8,
    RESEARCH: 5,
  };

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const tasks = [];

  for (let i = 0; i < count; i++) {
    let random = Math.random() * totalWeight;
    let selectedCategory: TaskCategory = "COMPUTATION";

    for (const [category, weight] of Object.entries(weights)) {
      random -= weight;
      if (random <= 0) {
        selectedCategory = category as TaskCategory;
        break;
      }
    }

    const categoryTemplates = TASK_TEMPLATES.filter((t) => t.category === selectedCategory);
    const template = categoryTemplates[Math.floor(Math.random() * categoryTemplates.length)];
    tasks.push(generateTaskFromTemplate(template));
  }

  return tasks;
}

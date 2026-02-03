import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  isShuttingDown: boolean;
};

// Initialize shutdown flag
globalForPrisma.isShuttingDown = false;

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/**
 * Check if the system is shutting down
 */
export function isShuttingDown(): boolean {
  return globalForPrisma.isShuttingDown;
}

/**
 * Graceful shutdown handler - disconnect Prisma and cleanup
 */
async function gracefulShutdown(signal: string): Promise<void> {
  if (globalForPrisma.isShuttingDown) return;
  globalForPrisma.isShuttingDown = true;

  console.log(`[DB] Received ${signal}, starting graceful shutdown...`);

  try {
    await db.$disconnect();
    console.log("[DB] Database connection closed");
  } catch (error) {
    console.error("[DB] Error during shutdown:", error);
  }

  process.exit(0);
}

// Register shutdown handlers (only in Node.js environment, not edge runtime)
if (typeof process !== "undefined" && process.on) {
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  // Handle uncaught errors to prevent silent crashes
  process.on("uncaughtException", (error) => {
    console.error("[DB] Uncaught exception:", error);
    gracefulShutdown("uncaughtException");
  });

  process.on("unhandledRejection", (reason) => {
    console.error("[DB] Unhandled rejection:", reason);
  });
}

/**
 * Execute a database operation with retry logic
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (isShuttingDown()) {
      throw new Error("Operation aborted: system is shutting down");
    }

    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on validation errors or constraint violations
      const errorMessage = lastError.message.toLowerCase();
      if (
        errorMessage.includes("unique constraint") ||
        errorMessage.includes("foreign key") ||
        errorMessage.includes("validation")
      ) {
        throw lastError;
      }

      // Log retry attempt
      if (attempt < maxRetries) {
        console.warn(`[DB] Retry ${attempt}/${maxRetries} after error:`, lastError.message);
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }

  throw lastError;
}

/**
 * Health check - verify database connection
 */
export async function checkHealth(): Promise<{ healthy: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();

  try {
    await db.$queryRaw`SELECT 1`;
    return { healthy: true, latencyMs: Date.now() - start };
  } catch (error) {
    return {
      healthy: false,
      latencyMs: Date.now() - start,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

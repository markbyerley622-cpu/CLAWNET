-- AlterTable
ALTER TABLE "SimulationState" ADD COLUMN     "contractAddress" TEXT;

-- CreateTable
CREATE TABLE "GlobalSettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "contractAddress" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalSettings_pkey" PRIMARY KEY ("id")
);

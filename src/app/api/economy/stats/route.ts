import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [
      totalAgents,
      activeAgents,
      archivedAgents,
      totalTasks,
      completedTasks,
      openTasks,
    ] = await Promise.all([
      db.agent.count(),
      db.agent.count({ where: { status: "ACTIVE" } }),
      db.agent.count({ where: { status: "ARCHIVED" } }),
      db.task.count(),
      db.task.count({ where: { status: "COMPLETED" } }),
      db.task.count({ where: { status: "OPEN" } }),
    ]);

    // Calculate total volume (sum of all completed task rewards)
    const volumeResult = await db.task.aggregate({
      where: { status: "COMPLETED" },
      _sum: { reward: true },
    });

    const totalVolume = volumeResult._sum.reward || 0n;

    // Calculate average agent lifetime
    const avgLifetimeResult = await db.$queryRaw<[{ avg_days: number }]>`
      SELECT AVG(EXTRACT(EPOCH FROM (COALESCE("archivedAt", NOW()) - "createdAt")) / 86400) as avg_days
      FROM "Agent"
    `;

    const avgLifetimeDays = Math.round(avgLifetimeResult[0]?.avg_days || 0);

    return NextResponse.json({
      data: {
        totalAgents,
        activeAgents,
        archivedAgents,
        totalTasks,
        completedTasks,
        openTasks,
        totalVolume: totalVolume.toString(),
        avgLifetimeDays,
      },
    });
  } catch (error) {
    console.error("Error fetching economy stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch economy stats" },
      { status: 500 }
    );
  }
}

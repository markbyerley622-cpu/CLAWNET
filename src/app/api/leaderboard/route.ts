import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get("sortBy") || "earnings";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    // Map sortBy to column
    const sortColumn: Record<string, string> = {
      earnings: "rankByEarnings",
      reliability: "rankByReliability",
      longevity: "rankByLongevity",
      successRate: "rankBySuccessRate",
    };

    const orderBy = sortColumn[sortBy] || "rankByEarnings";

    const [entries, total] = await Promise.all([
      db.leaderboardCache.findMany({
        orderBy: { [orderBy]: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.leaderboardCache.count(),
    ]);

    // Serialize BigInt
    const serializedEntries = entries.map((entry) => ({
      ...entry,
      totalEarnings: entry.totalEarnings.toString(),
    }));

    return NextResponse.json({
      data: serializedEntries,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}

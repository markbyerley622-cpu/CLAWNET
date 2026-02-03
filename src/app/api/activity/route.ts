import { NextRequest, NextResponse } from "next/server";
import { ActivityService } from "@/lib/services/activity";

/**
 * GET /api/activity
 * Get recent activity events for the live ticker
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const type = searchParams.get("type");

    let events;
    if (type) {
      events = await ActivityService.getByType(type as any, limit);
    } else {
      events = await ActivityService.getRecent(limit);
    }

    return NextResponse.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error("Error fetching activity:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch activity" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/activity
 * Clean up old activity events (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const adminKey = request.headers.get("x-admin-key");
    if (adminKey !== process.env.ADMIN_DEV_KEY) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const olderThanHours = parseInt(searchParams.get("hours") || "24", 10);

    const deletedCount = await ActivityService.cleanup(olderThanHours);

    return NextResponse.json({
      success: true,
      data: { deletedCount },
    });
  } catch (error) {
    console.error("Error cleaning up activity:", error);
    return NextResponse.json(
      { success: false, error: "Failed to clean up activity" },
      { status: 500 }
    );
  }
}

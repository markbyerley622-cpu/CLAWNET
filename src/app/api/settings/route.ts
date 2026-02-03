import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Force dynamic rendering
export const dynamic = "force-dynamic";

const SETTINGS_ID = "global";

// Default response when database is unavailable
const defaultResponse = () => NextResponse.json({
  success: true,
  data: {
    contractAddress: null,
    updatedAt: new Date(),
  },
});

/**
 * GET /api/settings
 * Get global settings (including contract address)
 */
export async function GET() {
  try {
    // Try GlobalSettings table first
    const settings = await db.globalSettings.findUnique({
      where: { id: SETTINGS_ID },
    });

    if (settings) {
      return NextResponse.json({
        success: true,
        data: {
          contractAddress: settings.contractAddress,
          updatedAt: settings.updatedAt,
        },
      });
    }

    // Create if doesn't exist
    const newSettings = await db.globalSettings.create({
      data: { id: SETTINGS_ID },
    });

    return NextResponse.json({
      success: true,
      data: {
        contractAddress: newSettings.contractAddress,
        updatedAt: newSettings.updatedAt,
      },
    });
  } catch (error) {
    // Database error - return defaults (don't spam console)
    return defaultResponse();
  }
}

/**
 * PATCH /api/settings
 * Update global settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractAddress } = body;

    // Validate contract address (allow null to clear, or string)
    if (contractAddress !== null && typeof contractAddress !== "string") {
      return NextResponse.json(
        { success: false, error: "Invalid contract address" },
        { status: 400 }
      );
    }

    // Upsert to GlobalSettings table
    const settings = await db.globalSettings.upsert({
      where: { id: SETTINGS_ID },
      create: {
        id: SETTINGS_ID,
        contractAddress: contractAddress || null,
      },
      update: {
        contractAddress: contractAddress || null,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        contractAddress: settings.contractAddress,
        updatedAt: settings.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { success: false, error: "Database not migrated. Run: npx prisma migrate deploy" },
      { status: 500 }
    );
  }
}

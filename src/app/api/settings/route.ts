import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Force dynamic rendering
export const dynamic = "force-dynamic";

const SETTINGS_ID = "global";

/**
 * GET /api/settings
 * Get global settings (including contract address)
 */
export async function GET() {
  try {
    // Try GlobalSettings table first
    try {
      let settings = await db.globalSettings.findUnique({
        where: { id: SETTINGS_ID },
      });

      // Create if doesn't exist
      if (!settings) {
        settings = await db.globalSettings.create({
          data: { id: SETTINGS_ID },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          contractAddress: settings.contractAddress,
          updatedAt: settings.updatedAt,
        },
      });
    } catch (dbError) {
      // Table might not exist yet - try fallback to SimulationState
      console.warn("GlobalSettings table error, trying fallback:", dbError);

      const simState = await db.simulationState.findUnique({
        where: { id: "singleton" },
      });

      return NextResponse.json({
        success: true,
        data: {
          contractAddress: simState?.contractAddress || null,
          updatedAt: simState?.updatedAt || new Date(),
        },
      });
    }
  } catch (error) {
    console.error("Error fetching settings:", error);
    // Return default values instead of error
    return NextResponse.json({
      success: true,
      data: {
        contractAddress: null,
        updatedAt: new Date(),
      },
    });
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

    // Upsert settings
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
      { success: false, error: "Failed to update settings" },
      { status: 500 }
    );
  }
}

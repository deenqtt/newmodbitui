import { NextRequest, NextResponse } from "next/server";
import { autoUpdateAllNodeTenantLocationStatus, nodeLocationStatusScheduler } from "@/lib/services/node-tenant-location-service";

/**
 * POST /api/cron - Auto update NodeTenantLocation status based on MQTT payload
 * Endpoint ini dipanggil secara berkala untuk monitoring status lokasi
 */
export async function POST(request: NextRequest) {
  try {
    console.log("Starting auto update of NodeTenantLocation status...");

    const result = await autoUpdateAllNodeTenantLocationStatus();

    return NextResponse.json({
      success: true,
      message: "Auto update completed successfully",
      data: result,
    });

  } catch (error) {
    console.error("Error in cron auto update:", error);

    return NextResponse.json({
      success: false,
      message: "Failed to auto update NodeTenantLocation status",
      error: error instanceof Error ? error.message : "Unknown error",
    }, {
      status: 500
    });
  }
}

/**
 * GET /api/cron - Manual check status atau kontrol scheduler
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    if (action === 'start') {
      // Start scheduler
      const interval = parseInt(searchParams.get('interval') || '1');
      nodeLocationStatusScheduler.start(interval);

      return NextResponse.json({
        success: true,
        message: `Scheduler started with ${interval} minute intervals`,
        status: nodeLocationStatusScheduler.getStatus(),
      });

    } else if (action === 'stop') {
      // Stop scheduler
      nodeLocationStatusScheduler.stop();

      return NextResponse.json({
        success: true,
        message: "Scheduler stopped",
        status: nodeLocationStatusScheduler.getStatus(),
      });

    } else if (action === 'status') {
      // Get scheduler status
      return NextResponse.json({
        success: true,
        status: nodeLocationStatusScheduler.getStatus(),
      });

    } else {
      // Default: Manual check
      const result = await autoUpdateAllNodeTenantLocationStatus();

      return NextResponse.json({
        success: true,
        message: "Manual check completed",
        data: result,
        timestamp: new Date().toISOString(),
      });
    }

  } catch (error) {
    console.error("Error in cron check:", error);

    return NextResponse.json({
      success: false,
      message: `Failed to ${action || 'check'} NodeTenantLocation status`,
      error: error instanceof Error ? error.message : "Unknown error",
    }, {
      status: 500
    });
  }
}

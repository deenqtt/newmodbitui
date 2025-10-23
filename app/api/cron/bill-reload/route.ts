// File: app/api/cron/bill-reload/route.ts
import { NextResponse } from "next/server";
import {
  getBillSchedulerService,
  getBillSchedulerInstance,
} from "@/lib/services/bill-scheduler";

/**
 * Ensure bill scheduler is initialized
 */
async function ensureBillSchedulerInitialized() {
  let scheduler = getBillSchedulerInstance();

  if (!scheduler) {
    console.log(
      "[BILL-API] ℹ️  Bill Scheduler not initialized, initializing now..."
    );
    scheduler = getBillSchedulerService();

    // Wait for initialization (max 3 seconds)
    let attempts = 0;
    while (!scheduler.getStatus().initialized && attempts < 30) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    if (!scheduler.getStatus().initialized) {
      throw new Error("Bill Scheduler initialization timeout");
    }
  }

  return scheduler;
}

/**
 * POST - Request bill scheduler reload
 */
export async function POST() {
  try {
    console.log("[BILL-API] 🔄 Bill cron reload requested via API");

    const scheduler = await ensureBillSchedulerInitialized();

    // Request reload
    scheduler.requestReload();

    console.log("[BILL-API] ✅ Bill reload request queued successfully");

    return NextResponse.json({
      success: true,
      message:
        "Bill reload requested successfully. Will reload within 5 seconds.",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[BILL-API] ❌ Error requesting bill reload:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to request bill reload",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Check bill scheduler status
 */
export async function GET() {
  try {
    const scheduler = await ensureBillSchedulerInitialized();
    const status = scheduler.getStatus();

    return NextResponse.json({
      initialized: status.initialized,
      activeTimers: status.activeTimers,
      intervalMinutes: status.intervalMinutes,
      configs: status.configs,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        initialized: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

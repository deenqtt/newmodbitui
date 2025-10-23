// File: app/api/cron/calculation-reload/route.ts
import { NextResponse } from "next/server";
import {
  getCalculationService,
  getCalculationServiceInstance,
} from "@/lib/services/calculation-service";

/**
 * Ensure calculation service is initialized
 */
async function ensureCalculationServiceInitialized() {
  let service = getCalculationServiceInstance();

  if (!service) {
    console.log(
      "[CALC-API] ℹ️  Calculation Service not initialized, initializing now..."
    );
    service = getCalculationService();

    // Wait for initialization (max 3 seconds)
    let attempts = 0;
    while (!service.getStatus().initialized && attempts < 30) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    if (!service.getStatus().initialized) {
      throw new Error("Calculation Service initialization timeout");
    }
  }

  return service;
}

/**
 * POST - Request calculation service reload (untuk PUE, Bill, Power Analyzer)
 */
export async function POST() {
  try {
    console.log("[CALC-API] 🔄 Calculation service reload requested via API");

    const service = await ensureCalculationServiceInitialized();

    // Request reload
    service.requestReload();

    console.log("[CALC-API] ✅ Calculation reload request queued successfully");

    return NextResponse.json({
      success: true,
      message:
        "Calculation service reload requested successfully. Will reload within 5 seconds.",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[CALC-API] ❌ Error requesting calculation reload:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to request calculation reload",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Check calculation service status
 */
export async function GET() {
  try {
    const service = await ensureCalculationServiceInitialized();
    const status = service.getStatus();

    return NextResponse.json({
      ...status,
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

// File: app/api/power-analyzer-configs/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth"; // Pastikan path ini benar
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

/**
 * Helper untuk validasi struktur JSON listSensors dan chartConfig
 */
function validatePowerAnalyzerJson(listSensors: any, chartConfig: any) {
  const errors: string[] = [];
  let validatedListSensors: any[] = [];
  let validatedChartConfig: Record<string, any> = {};

  // Validate listSensors
  if (!Array.isArray(listSensors)) {
    errors.push("List of sensors must be an array.");
  } else if (listSensors.length === 0) {
    errors.push("At least one sensor must be configured.");
  } else {
    validatedListSensors = listSensors
      .map((sensor: any, index: number) => {
        if (
          !sensor ||
          typeof sensor !== "object" ||
          !sensor.topicUniqId ||
          !sensor.key
        ) {
          errors.push(
            `Sensor at index ${index} has invalid structure or missing required fields (topicUniqId, key).`
          );
          return null;
        }
        return {
          topicUniqId: String(sensor.topicUniqId),
          name: sensor.name || `Sensor-${index + 1}`, // Menggunakan name dari frontend jika ada, atau generate
          key: String(sensor.key),
          value: null, // Initial value is null, filled by MQTT
        };
      })
      .filter(Boolean); // Filter out any nulls

    if (validatedListSensors.length === 0 && listSensors.length > 0) {
      errors.push("All sensors configured are invalid.");
    }
  }

  // Validate chartConfig (optional, bisa lebih ketat)
  if (chartConfig && typeof chartConfig === "object") {
    validatedChartConfig = chartConfig;
  } else if (chartConfig !== null && chartConfig !== undefined) {
    errors.push(
      "Chart configuration must be a valid JSON object or null/undefined."
    );
  } else {
    validatedChartConfig = {}; // Default to empty object if not provided/invalid
  }

  return {
    listSensors: validatedListSensors,
    chartConfig: validatedChartConfig,
    errors,
  };
}

/**
 * FUNGSI GET: Mengambil semua konfigurasi Power Analyzer.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const configs = await prisma.powerAnalyzerConfiguration.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(configs);
  } catch (error: any) {
    console.error("Error fetching Power Analyzer configurations:", error);
    return NextResponse.json(
      {
        message: "Failed to fetch Power Analyzer configurations.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * FUNGSI POST: Membuat konfigurasi Power Analyzer baru.
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { customName, listSensors, chartConfig } = body;

    // Validasi dasar keberadaan field
    if (!customName || !listSensors) {
      // chartConfig bisa null
      return NextResponse.json(
        { message: "Missing required fields: customName, listSensors" },
        { status: 400 }
      );
    }

    const {
      listSensors: validatedListSensors,
      chartConfig: validatedChartConfig,
      errors: validationErrors,
    } = validatePowerAnalyzerJson(listSensors, chartConfig);

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { message: "Validation errors", errors: validationErrors },
        { status: 400 }
      );
    }

    // Periksa apakah customName sudah ada
    const existingConfig = await prisma.powerAnalyzerConfiguration.findUnique({
      where: { customName },
    });
    if (existingConfig) {
      return NextResponse.json(
        { message: "Custom name already exists." },
        { status: 409 }
      );
    }

    // Buat DeviceExternal baru untuk customName ini (API Topic Power Analyzer)
    const sanitizedCustomName = customName.replace(/\s+/g, "_");
    const apiTopic = await prisma.deviceExternal.create({
      data: {
        name: `${customName} (Power Analyzer API)`,
        topic: `IOT/PowerAnalyzer/${sanitizedCustomName}`,
        address: "power-analyzer-system-virtual",
      },
    });

    // Buat konfigurasi Power Analyzer baru, referensikan uniqId dari DeviceExternal yang baru dibuat
    const newConfig = await prisma.powerAnalyzerConfiguration.create({
      data: {
        customName,
        type: "powerAnalyzer",
        apiTopicUniqId: apiTopic.uniqId, // Gunakan uniqId dari DeviceExternal
        listSensors: validatedListSensors, // Prisma akan otomatis mengonversi ke JSONB
        chartConfig: validatedChartConfig, // Prisma akan otomatis mengonversi ke JSONB
      },
    });

    return NextResponse.json(newConfig, { status: 201 });
  } catch (error: any) {
    console.error("Error creating Power Analyzer configuration:", error);
    return NextResponse.json(
      {
        message: "Failed to create Power Analyzer configuration.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

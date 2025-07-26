// File: app/api/power-analyzer-configs/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth"; // Pastikan path ini benar
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

/**
 * Helper untuk validasi struktur JSON listSensors dan chartConfig (sama seperti di route.ts)
 */
function validatePowerAnalyzerJson(listSensors: any, chartConfig: any) {
  const errors: string[] = [];
  let validatedListSensors: any[] = [];
  let validatedChartConfig: Record<string, any> = {};

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
          name: sensor.name || `Sensor-${index + 1}`,
          key: String(sensor.key),
          value: null,
        };
      })
      .filter(Boolean);

    if (validatedListSensors.length === 0 && listSensors.length > 0) {
      errors.push("All sensors configured are invalid.");
    }
  }

  if (chartConfig && typeof chartConfig === "object") {
    validatedChartConfig = chartConfig;
  } else if (chartConfig !== null && chartConfig !== undefined) {
    errors.push(
      "Chart configuration must be a valid JSON object or null/undefined."
    );
  } else {
    validatedChartConfig = {};
  }

  return {
    listSensors: validatedListSensors,
    chartConfig: validatedChartConfig,
    errors,
  };
}

/**
 * FUNGSI GET: Mengambil konfigurasi Power Analyzer berdasarkan ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;

  try {
    const config = await prisma.powerAnalyzerConfiguration.findUnique({
      where: { id },
    });

    if (!config) {
      return NextResponse.json(
        { message: "Power Analyzer configuration not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(config);
  } catch (error: any) {
    console.error(
      `Error fetching Power Analyzer configuration with ID ${id}:`,
      error
    );
    return NextResponse.json(
      {
        message: "Failed to fetch Power Analyzer configuration.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * FUNGSI PUT: Memperbarui konfigurasi Power Analyzer.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = params;

  try {
    const body = await request.json();
    const { customName, listSensors, chartConfig } = body;

    if (!customName || !listSensors) {
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

    // Periksa apakah customName sudah digunakan oleh konfigurasi lain (kecuali yang sedang diedit)
    const existingConfig = await prisma.powerAnalyzerConfiguration.findUnique({
      where: { customName },
    });
    if (existingConfig && existingConfig.id !== id) {
      return NextResponse.json(
        { message: "Custom name already exists for another configuration." },
        { status: 409 }
      );
    }

    // --- NEW LOGIC: Update associated DeviceExternal if customName changes ---
    const oldConfig = await prisma.powerAnalyzerConfiguration.findUnique({
      where: { id },
      select: { customName: true, apiTopicUniqId: true },
    });

    if (!oldConfig) {
      return NextResponse.json(
        { message: "Power Analyzer configuration not found" },
        { status: 404 }
      );
    }

    // Jika customName berubah DAN ada apiTopicUniqId yang terkait
    if (oldConfig.customName !== customName && oldConfig.apiTopicUniqId) {
      const sanitizedCustomName = customName.replace(/\s+/g, "_");
      const newTopic = `IOT/PowerAnalyzer/${sanitizedCustomName}`; // Topik Power Analyzer
      const newName = `${customName} (Power Analyzer API)`;

      try {
        // Pencegahan konflik topik
        const existingDeviceWithNewTopic =
          await prisma.deviceExternal.findUnique({
            where: { topic: newTopic },
          });

        if (
          existingDeviceWithNewTopic &&
          existingDeviceWithNewTopic.uniqId !== oldConfig.apiTopicUniqId
        ) {
          return NextResponse.json(
            {
              message: `New topic "${newTopic}" generated from custom name is already in use by another device.`,
            },
            { status: 409 }
          );
        }

        await prisma.deviceExternal.update({
          where: { uniqId: oldConfig.apiTopicUniqId },
          data: {
            name: newName,
            topic: newTopic,
          },
        });
        console.log(
          `[Backend] Updated DeviceExternal for Power Analyzer API Topic: ${oldConfig.apiTopicUniqId} to name "${newName}" and topic "${newTopic}"`
        );
      } catch (deviceError: any) {
        console.error(
          `[Backend] Error updating associated DeviceExternal for Power Analyzer config ${id}:`,
          deviceError
        );
        return NextResponse.json(
          {
            message: `Failed to update associated device: ${deviceError.message}`,
          },
          { status: 500 }
        );
      }
    }
    // --- END NEW LOGIC ---

    const updatedConfig = await prisma.powerAnalyzerConfiguration.update({
      where: { id },
      data: {
        customName,
        listSensors: validatedListSensors,
        chartConfig: validatedChartConfig,
      },
    });

    return NextResponse.json(updatedConfig);
  } catch (error: any) {
    console.error(
      `Error updating Power Analyzer configuration with ID ${id}:`,
      error
    );
    return NextResponse.json(
      {
        message: "Failed to update Power Analyzer configuration.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * FUNGSI DELETE: Menghapus konfigurasi Power Analyzer.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = params;

  try {
    // Ambil apiTopicUniqId sebelum menghapus
    const config = await prisma.powerAnalyzerConfiguration.findUnique({
      where: { id },
      select: { apiTopicUniqId: true },
    });

    if (!config) {
      return NextResponse.json(
        { message: "Power Analyzer configuration not found" },
        { status: 404 }
      );
    }

    // Hapus konfigurasi Power Analyzer
    await prisma.powerAnalyzerConfiguration.delete({
      where: { id },
    });

    // Jika ada apiTopicUniqId, hapus juga DeviceExternal yang terkait
    if (config.apiTopicUniqId) {
      await prisma.deviceExternal.delete({
        where: { uniqId: config.apiTopicUniqId },
      });
    }

    return NextResponse.json({
      message: "Power Analyzer configuration deleted successfully",
    });
  } catch (error: any) {
    console.error(
      `Error deleting Power Analyzer configuration with ID ${id}:`,
      error
    );
    return NextResponse.json(
      {
        message: "Failed to delete Power Analyzer configuration.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

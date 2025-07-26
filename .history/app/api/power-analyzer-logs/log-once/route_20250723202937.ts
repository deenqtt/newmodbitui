// File: app/api/power-analyzer-logs/log-once/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

/**
 * Helper function to calculate total power analyzer value from sensors' lastPayloads.
 * This is similar to calculatePowerAnalyzerTotal in mqtt-listener-service.js.
 * @param config The PowerAnalyzerConfiguration object.
 * @param lastKnownPayloadsMap A Map of deviceUniqId to { payload: Record<string, any> }.
 * @returns The calculated total value or null if no valid sensor data.
 */
function calculatePowerAnalyzerTotal(config: any, sensorDevices: Array<any>) {
  if (!config.listSensors || config.listSensors.length === 0) {
    return null;
  }
  let totalValue = 0;
  let hasValidSensor = false;

  (config.listSensors || []).forEach((sensor: any) => {
    const device = sensorDevices.find((d) => d.uniqId === sensor.topicUniqId);
    if (device && device.lastPayload && sensor.key in device.lastPayload) {
      const val = parseFloat(device.lastPayload[sensor.key]);
      if (!isNaN(val)) {
        totalValue += val;
        hasValidSensor = true;
      } else {
        console.warn(
          `[PowerAnalyzerLogOnce] Sensor key "${sensor.key}" has non-numeric value in lastPayload for device ${device.uniqId}.`
        );
      }
    } else {
      console.warn(
        `[PowerAnalyzerLogOnce] Sensor key "${sensor.key}" or device ${sensor.topicUniqId} not found in lastPayloads.`
      );
    }
  });

  return hasValidSensor ? totalValue : null;
}

/**
 * FUNGSI POST: Mencatat satu log Power Analyzer untuk konfigurasi tertentu.
 * Endpoint ini akan memicu kalkulasi dan log data terakhir dari lastPayload
 * (mirip dengan bagaimana MQTT listener service bekerja, tapi on-demand).
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { configId } = await request.json();

    if (!configId) {
      return NextResponse.json(
        { message: "Missing configId." },
        { status: 400 }
      );
    }

    const config = await prisma.powerAnalyzerConfiguration.findUnique({
      where: { id: configId },
    });

    if (!config) {
      return NextResponse.json(
        { message: "Configuration not found." },
        { status: 404 }
      );
    }

    // Ambil lastPayload dari setiap device sensor yang terlibat
    const sensorUniqIds = ((config.listSensors as Array<any>) || []).map(
      (s) => s.topicUniqId
    );
    const sensorDevices = await prisma.deviceExternal.findMany({
      where: { uniqId: { in: sensorUniqIds } },
      select: { uniqId: true, lastPayload: true }, // Ambil lastPayload
    });

    const totalPower = calculatePowerAnalyzerTotal(config, sensorDevices);

    if (totalPower === null) {
      return NextResponse.json(
        { message: "No valid sensor data available to log." },
        { status: 400 }
      );
    }

    // Buat log baru
    const newLog = await prisma.powerAnalyzerLog.create({
      data: {
        configId: config.id,
        value: totalPower, // Log total power
      },
    });

    return NextResponse.json(newLog, { status: 201 });
  } catch (error: any) {
    console.error("Error creating Power Analyzer log (log-once):", error);
    return NextResponse.json(
      { message: "Failed to create Power Analyzer log.", error: error.message },
      { status: 500 }
    );
  }
}

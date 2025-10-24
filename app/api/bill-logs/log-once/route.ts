// File BARU: app/api/bill-logs/log-once/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Paho from "paho-mqtt";
import { getAuthFromCookie } from "@/lib/auth";
import { Role } from "@prisma/client";

// Fungsi helper untuk mengambil data MQTT sekali jalan
const getMqttDataOnce = (
  topic: string,
  key: string
): Promise<number | null> => {
  return new Promise((resolve, reject) => {
    function getMQTTHost(): string {
      // Development: gunakan env variable
      if (process.env.NEXT_PUBLIC_MQTT_HOST) {
        return process.env.NEXT_PUBLIC_MQTT_HOST;
      }

      // Server-side fallback ke localhost
      return "localhost";
    }

    // Ganti bagian client initialization:
    const client = new Paho.Client(
      getMQTTHost(), // UBAH INI
      parseInt(process.env.NEXT_PUBLIC_MQTT_PORT || "9000"), // UBAH INI
      `cron-logger-${Date.now()}`
    );

    client.onMessageArrived = (message) => {
      try {
        const payload = JSON.parse(message.payloadString);
        const innerValue = JSON.parse(payload.value);
        const value = parseFloat(innerValue[key]);
        if (!isNaN(value)) {
          client.disconnect();
          resolve(value);
        }
      } catch (e) {
        // Abaikan jika parse gagal
      }
    };

    client.connect({
      onSuccess: () => {
        client.subscribe(topic);
        // Beri waktu 3 detik untuk data masuk, jika tidak ada, anggap gagal
        setTimeout(() => {
          if (client.isConnected()) {
            client.disconnect();
            resolve(null); // Tidak ada data yang diterima
          }
        }, 3000);
      },
      onFailure: (err) => reject(new Error(err.errorMessage)),
      useSSL: false,
    });
  });
};

export async function POST(request: Request) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { configId } = await request.json();
    if (!configId) {
      return NextResponse.json(
        { message: "Config ID is required" },
        { status: 400 }
      );
    }

    const config = await prisma.billConfiguration.findUnique({
      where: { id: configId },
      include: { sourceDevice: true },
    });

    if (!config) {
      return NextResponse.json(
        { message: "Configuration not found" },
        { status: 404 }
      );
    }

    const rawValue = await getMqttDataOnce(
      config.sourceDevice.topic,
      config.sourceDeviceKey
    );

    if (rawValue === null) {
      return NextResponse.json(
        { message: "No data received from MQTT source." },
        { status: 202 }
      );
    }

    const energyKwh = (rawValue * 1) / 1000;
    const rupiahCost = energyKwh * config.rupiahRatePerKwh;
    const dollarCost = energyKwh * config.dollarRatePerKwh;

    const newLog = await prisma.billLog.create({
      data: {
        configId: config.id,
        rawValue,
        rupiahCost,
        dollarCost,
      },
    });

    return NextResponse.json(newLog, { status: 201 });
  } catch (error: any) {
    console.error("Error logging once:", error);
    return NextResponse.json(
      { message: "Failed to create initial log.", error: error.message },
      { status: 500 }
    );
  }
}

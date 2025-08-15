// File: app/api/alarms/summary/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AlarmType } from "@prisma/client";

export async function GET() {
  try {
    // Gunakan aggregate untuk menghitung jumlah log alarm yang aktif
    const summary = await prisma.alarmLog.groupBy({
      by: ["alarmConfigId"], // Kelompokkan berdasarkan konfigurasi alarm
      where: {
        status: "ACTIVE", // Hanya hitung yang statusnya ACTIVE
      },
      _count: {
        id: true,
      },
    });

    // Ambil detail tipe alarm dari konfigurasi
    const alarmConfigIds = summary.map((item) => item.alarmConfigId);
    const configs = await prisma.alarmConfiguration.findMany({
      where: {
        id: { in: alarmConfigIds },
      },
      select: {
        id: true,
        alarmType: true,
      },
    });

    // Buat map untuk pencarian cepat
    const configTypeMap = new Map(configs.map((c) => [c.id, c.alarmType]));

    // Inisialisasi hasil
    const result = {
      CRITICAL: 0,
      MAJOR: 0,
      MINOR: 0,
    };

    // Akumulasi hitungan berdasarkan tipe alarm
    for (const item of summary) {
      const type = configTypeMap.get(item.alarmConfigId);
      if (type && result.hasOwnProperty(type)) {
        result[type]++;
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching alarm summary:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth"; // Asumsi path helper auth Anda
import { triggerMqttServiceUpdate } from "@/lib/mqtt-service-trigger"; // <-- 1. IMPORT

/**
 * GET: Mengambil semua PowerAnalyzerConfiguration
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const configs = await prisma.powerAnalyzerConfiguration.findMany({
      include: {
        apiTopic: true, // Sertakan detail topic untuk frontend
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(configs);
  } catch (error: any) {
    console.error("Error fetching Power Analyzer configs:", error);
    return NextResponse.json(
      { message: "Failed to fetch configurations", error: error.message },
      { status: 500 }
    );
  }
}

// --- INI BAGIAN YANG TERLEWAT ---
/**
 * POST: Membuat PowerAnalyzerConfiguration baru beserta DeviceExternal untuk API
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { customName, pduList, mainPower } = body;

    if (!customName || !pduList || !mainPower) {
      return NextResponse.json(
        { message: "Missing required fields: customName, pduList, mainPower" },
        { status: 400 }
      );
    }

    const sanitizedCustomName = customName.replace(/\s+/g, "_");
    const topicName = `IOT/PowerAnalyzer/${sanitizedCustomName}`;

    // Gunakan transaksi untuk memastikan kedua operasi berhasil
    const newConfig = await prisma.$transaction(async (tx) => {
      // 1. Buat DeviceExternal baru untuk API topic
      const newApiTopic = await tx.deviceExternal.create({
        data: {
          name: customName,
          topic: topicName,
        },
      });

      // 2. Buat PowerAnalyzerConfiguration dan hubungkan dengan topic di atas
      const newPowerAnalyzerConfig = await tx.powerAnalyzerConfiguration.create(
        {
          data: {
            customName,
            pduList,
            mainPower,
            apiTopic: {
              connect: {
                uniqId: newApiTopic.uniqId,
              },
            },
          },
          include: {
            apiTopic: true,
          },
        }
      );

      return newPowerAnalyzerConfig;
    });
    triggerMqttServiceUpdate(); // <-- 2. PANGGIL FUNGSI DI SINI

    return NextResponse.json(newConfig, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      const target = error.meta?.target as string[];
      if (target?.includes("customName")) {
        return NextResponse.json(
          { message: "Custom name already exists." },
          { status: 409 }
        );
      }
      if (target?.includes("topic")) {
        return NextResponse.json(
          {
            message:
              "Topic name already exists from the generated custom name.",
          },
          { status: 409 }
        );
      }
    }

    console.error("Error creating Power Analyzer config:", error);
    return NextResponse.json(
      { message: "Failed to create configuration", error: error.message },
      { status: 500 }
    );
  }
}

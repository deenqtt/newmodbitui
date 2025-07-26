import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth"; // Asumsi path helper auth Anda

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
        // Sertakan detail topic agar mudah diakses di frontend
        apiTopic: true,
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

    // Ganti spasi dengan underscore dan pastikan unik untuk nama topic
    const sanitizedCustomName = customName.replace(/\s+/g, "_");
    const topicName = `IOT/PowerAnalyzer/${sanitizedCustomName}_${Date.now()}`;

    // Gunakan transaksi untuk memastikan kedua operasi (membuat device & config) berhasil
    const newConfig = await prisma.$transaction(async (tx) => {
      // 1. Buat DeviceExternal baru untuk API topic
      const newApiTopic = await tx.deviceExternal.create({
        data: {
          name: customName,
          topic: topicName,
          // Field lain bisa null atau default
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
            apiTopic: true, // Sertakan topic dalam respons
          },
        }
      );

      return newPowerAnalyzerConfig;
    });

    return NextResponse.json(newConfig, { status: 201 });
  } catch (error: any) {
    // Tangani error jika customName sudah ada (karena @unique)
    if (error.code === "P2002" && error.meta?.target?.includes("customName")) {
      return NextResponse.json(
        { message: "Custom name already exists. Please choose another name." },
        { status: 409 }
      );
    }

    console.error("Error creating Power Analyzer config:", error);
    return NextResponse.json(
      { message: "Failed to create configuration", error: error.message },
      { status: 500 }
    );
  }
}

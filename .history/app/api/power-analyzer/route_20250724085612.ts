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

/**
 * PUT: Memperbarui satu PowerAnalyzerConfiguration dan DeviceExternal terkait
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { customName, pduList, mainPower } = body;

    // Format topic baru jika customName berubah
    const sanitizedCustomName = customName.replace(/\s+/g, "_");
    const newTopicName = `IOT/PowerAnalyzer/${sanitizedCustomName}`;

    const updatedConfig = await prisma.$transaction(async (tx) => {
      // 1. Update PowerAnalyzerConfiguration
      const config = await tx.powerAnalyzerConfiguration.update({
        where: { id: params.id },
        data: {
          customName,
          pduList,
          mainPower,
        },
        include: { apiTopic: true },
      });

      // 2. Jika ada topic terkait, update juga DeviceExternal-nya
      if (config.apiTopicUniqId) {
        await tx.deviceExternal.update({
          where: { uniqId: config.apiTopicUniqId },
          data: {
            name: customName, // Update nama
            topic: newTopicName, // Update topic
          },
        });
      }
      return config;
    });

    return NextResponse.json(updatedConfig);
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
    console.error(`Error updating config ${params.id}:`, error);
    return NextResponse.json(
      { message: "Failed to update configuration" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Menghapus satu PowerAnalyzerConfiguration dan DeviceExternal terkait
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const configToDelete = await tx.powerAnalyzerConfiguration.findUnique({
        where: { id: params.id },
        select: { apiTopicUniqId: true },
      });

      if (!configToDelete) {
        // Agar bisa ditangkap di blok catch
        throw new Error("Configuration not found");
      }

      // Hapus PowerAnalyzerConfiguration dulu
      await tx.powerAnalyzerConfiguration.delete({
        where: { id: params.id },
      });

      // Jika ada topic terkait, hapus juga DeviceExternal-nya
      if (configToDelete.apiTopicUniqId) {
        await tx.deviceExternal.delete({
          where: { uniqId: configToDelete.apiTopicUniqId },
        });
      }
    });

    return NextResponse.json(
      { message: "Configuration deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.message === "Configuration not found") {
      return NextResponse.json(
        { message: "Configuration not found" },
        { status: 404 }
      );
    }
    console.error(`Error deleting config ${params.id}:`, error);
    return NextResponse.json(
      { message: "Failed to delete configuration" },
      { status: 500 }
    );
  }
}

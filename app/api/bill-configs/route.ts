import { NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { triggerMqttServiceUpdate } from "@/lib/mqtt-service-trigger";

/**
 * FUNGSI GET: Mengambil semua konfigurasi tagihan.
 */
export async function GET(request: Request) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const configs = await prisma.billConfiguration.findMany({
      include: {
        sourceDevice: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(configs);
  } catch (error) {
    console.error("Error fetching bill configurations:", error);
    return NextResponse.json(
      { message: "Failed to fetch configurations." },
      { status: 500 }
    );
  }
}

/**
 * FUNGSI POST: Membuat konfigurasi tagihan baru.
 */
export async function POST(request: Request) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const targetDevice = await prisma.deviceExternal.create({
      data: {
        name: `${body.customName} (Virtual)`,
        topic: `IOT/BillCalculation/${body.customName.replace(/\s+/g, "_")}`,
        address: "virtual-device",
      },
    });

    const newConfig = await prisma.billConfiguration.create({
      data: {
        customName: body.customName,
        sourceDeviceUniqId: body.sourceDeviceUniqId,
        sourceDeviceKey: body.sourceDeviceKey,
        rupiahRatePerKwh: body.rupiahRatePerKwh,
        dollarRatePerKwh: body.dollarRatePerKwh,
        publishTargetDeviceUniqId: targetDevice.uniqId,
      },
    });

    triggerMqttServiceUpdate();

    return NextResponse.json(newConfig, { status: 201 });
  } catch (error) {
    console.error("Error creating bill configuration:", error);
    return NextResponse.json(
      { message: "Failed to create configuration." },
      { status: 500 }
    );
  }
}

/**
 * FUNGSI PUT: Mengupdate konfigurasi tagihan berdasarkan ID.
 */
export async function PUT(request: Request) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, customName, sourceDeviceUniqId, sourceDeviceKey, rupiahRatePerKwh, dollarRatePerKwh } = body;

    const updatedConfig = await prisma.billConfiguration.update({
      where: { id },
      data: {
        customName,
        sourceDeviceUniqId,
        sourceDeviceKey,
        rupiahRatePerKwh,
        dollarRatePerKwh,
      },
    });

    triggerMqttServiceUpdate();

    return NextResponse.json(updatedConfig);
  } catch (error) {
    console.error("Error updating bill configuration:", error);
    return NextResponse.json(
      { message: "Failed to update configuration." },
      { status: 500 }
    );
  }
}

/**
 * FUNGSI DELETE: Menghapus konfigurasi tagihan berdasarkan ID.
 */
export async function DELETE(request: Request) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "ID is required" }, { status: 400 });
    }

    await prisma.billConfiguration.delete({
      where: { id },
    });

    triggerMqttServiceUpdate();

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting bill configuration:", error);
    return NextResponse.json(
      { message: "Failed to delete configuration." },
      { status: 500 }
    );
  }
}

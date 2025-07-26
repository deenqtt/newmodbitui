// File: app/api/pue-configs/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth"; // Pastikan path ini benar
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { triggerMqttServiceUpdate } from "@/lib/mqtt-service-trigger"; // <-- IMPORT

/**
 * Helper untuk validasi struktur JSON PDU dan Main Power (sama seperti di route.ts)
 */
function validatePueJson(pduList: any, mainPower: any) {
  const errors: string[] = [];
  let validatedPduList: any[] = [];
  let validatedMainPower: any = {};

  // Validate mainPower
  if (
    !mainPower ||
    typeof mainPower !== "object" ||
    !mainPower.topicUniqId ||
    !mainPower.key
  ) {
    errors.push(
      "Main Power configuration is invalid or missing required fields (topicUniqId, key)."
    );
  } else {
    validatedMainPower = {
      topicUniqId: String(mainPower.topicUniqId),
      key: String(mainPower.key),
      value: null, // Reset value saat menyimpan/mengupdate konfigurasi
    };
  }

  // Validate pduList
  if (!Array.isArray(pduList)) {
    errors.push("PDU List must be an array.");
  } else {
    validatedPduList = pduList
      .map((pdu: any, index: number) => {
        if (
          !pdu ||
          typeof pdu !== "object" ||
          !pdu.topicUniqId ||
          !Array.isArray(pdu.keys)
        ) {
          errors.push(
            `PDU at index ${index} has invalid structure or missing required fields (topicUniqId, keys).`
          );
          return null;
        }
        return {
          topicUniqId: String(pdu.topicUniqId),
          name: pdu.name || `PDU-${index + 1}`,
          keys: pdu.keys.map(String),
          value: null, // Reset value saat menyimpan/mengupdate konfigurasi
        };
      })
      .filter(Boolean);
  }
  return { pduList: validatedPduList, mainPower: validatedMainPower, errors };
}

/**
 * FUNGSI GET: Mengambil konfigurasi PUE berdasarkan ID.
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
    const pueConfig = await prisma.pueConfiguration.findUnique({
      where: { id },
    });

    if (!pueConfig) {
      return NextResponse.json(
        { message: "PUE configuration not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(pueConfig);
  } catch (error) {
    console.error(`Error fetching PUE configuration with ID ${id}:`, error);
    return NextResponse.json(
      { message: "Failed to fetch PUE configuration." },
      { status: 500 }
    );
  }
}

/**
 * FUNGSI PUT: Memperbarui konfigurasi PUE dan DeviceExternal terkait jika customName berubah.
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
    const { customName, pduList, mainPower } = body;

    if (!customName || !pduList || !mainPower) {
      return NextResponse.json(
        { message: "Missing required fields: customName, pduList, mainPower" },
        { status: 400 }
      );
    }

    const {
      pduList: validatedPduList,
      mainPower: validatedMainPower,
      errors: validationErrors,
    } = validatePueJson(pduList, mainPower);

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { message: "Validation errors", errors: validationErrors },
        { status: 400 }
      );
    }

    // Periksa apakah customName sudah digunakan oleh konfigurasi lain (kecuali yang sedang diedit)
    const existingConfig = await prisma.pueConfiguration.findUnique({
      where: { customName },
    });
    if (existingConfig && existingConfig.id !== id) {
      return NextResponse.json(
        { message: "Custom name already exists for another configuration." },
        { status: 409 }
      );
    }

    // --- NEW LOGIC: Update associated DeviceExternal if customName changes ---
    // 1. Ambil konfigurasi PUE yang sudah ada untuk mendapatkan apiTopicUniqId dan customName lama
    const oldPueConfig = await prisma.pueConfiguration.findUnique({
      where: { id },
      select: { customName: true, apiTopicUniqId: true },
    });

    if (!oldPueConfig) {
      return NextResponse.json(
        { message: "PUE configuration not found" },
        { status: 404 }
      );
    }

    // Jika customName berubah DAN ada apiTopicUniqId yang terkait
    if (oldPueConfig.customName !== customName && oldPueConfig.apiTopicUniqId) {
      const sanitizedCustomName = customName.replace(/\s+/g, "_");
      const newTopic = `IOT/PUE/${sanitizedCustomName}`;
      const newName = `${customName} (PUE Main)`;

      try {
        // Periksa apakah topik baru sudah digunakan oleh device lain (selain device itu sendiri)
        const existingDeviceWithNewTopic =
          await prisma.deviceExternal.findUnique({
            where: { topic: newTopic },
          });

        if (
          existingDeviceWithNewTopic &&
          existingDeviceWithNewTopic.uniqId !== oldPueConfig.apiTopicUniqId
        ) {
          return NextResponse.json(
            {
              message: `New topic "${newTopic}" generated from custom name is already in use by another device.`,
            },
            { status: 409 }
          );
        }

        // Update DeviceExternal yang terkait
        await prisma.deviceExternal.update({
          where: { uniqId: oldPueConfig.apiTopicUniqId },
          data: {
            name: newName,
            topic: newTopic,
          },
        });
        console.log(
          `[Backend] Updated DeviceExternal for PUE API Topic: ${oldPueConfig.apiTopicUniqId} to name "${newName}" and topic "${newTopic}"`
        );
      } catch (deviceError: any) {
        console.error(
          `[Backend] Error updating associated DeviceExternal for PUE config ${id}:`,
          deviceError
        );
        // Anda bisa memilih untuk mengembalikan error di sini atau hanya log
        return NextResponse.json(
          {
            message: `Failed to update associated device: ${deviceError.message}`,
          },
          { status: 500 }
        );
      }
    }
    // --- END NEW LOGIC ---

    const updatedPueConfig = await prisma.pueConfiguration.update({
      where: { id },
      data: {
        customName,
        pduList: validatedPduList,
        mainPower: validatedMainPower,
      },
    });
    triggerMqttServiceUpdate(); // <-- PANGGIL SETELAH UPDATE BERHASIL

    return NextResponse.json(updatedPueConfig);
  } catch (error: any) {
    console.error(`Error updating PUE configuration with ID ${id}:`, error);
    return NextResponse.json(
      { message: "Failed to update PUE configuration.", error: error.message },
      { status: 500 }
    );
  }
}

/**
 * FUNGSI DELETE: Menghapus konfigurasi PUE.
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
    const pueConfig = await prisma.pueConfiguration.findUnique({
      where: { id },
      select: { apiTopicUniqId: true },
    });

    if (!pueConfig) {
      return NextResponse.json(
        { message: "PUE configuration not found" },
        { status: 404 }
      );
    }

    // Hapus konfigurasi PUE
    await prisma.pueConfiguration.delete({
      where: { id },
    });

    // Jika ada apiTopicUniqId, hapus juga DeviceExternal yang terkait
    if (pueConfig.apiTopicUniqId) {
      await prisma.deviceExternal.delete({
        where: { uniqId: pueConfig.apiTopicUniqId },
      });
    }
    triggerMqttServiceUpdate(); // <-- PANGGIL SETELAH DELETE BERHASIL

    return NextResponse.json({
      message: "PUE configuration deleted successfully",
    });
  } catch (error: any) {
    console.error(`Error deleting PUE configuration with ID ${id}:`, error);
    return NextResponse.json(
      { message: "Failed to delete PUE configuration.", error: error.message },
      { status: 500 }
    );
  }
}

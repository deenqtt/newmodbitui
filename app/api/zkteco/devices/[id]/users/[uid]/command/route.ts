// File: /app/api/zkteco/devices/[id]/users/[uid]/command/route.ts
// Deskripsi: API terpusat untuk SEMUA perintah ke ZKTeco.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";
import { Role } from "@prisma/client";
import { zkTecoServiceInstance } from "@/lib/services/zkteco-service";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; uid: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const body = await request.json();
    const { command, args = [] } = body;
    const { id: deviceId, uid } = params;

    if (!command) {
      return new NextResponse("Missing required field: command", {
        status: 400,
      });
    }

    const device = await prisma.zkTecoDevice.findUnique({
      where: { id: deviceId },
    });
    if (!device) {
      return new NextResponse("Device not found", { status: 404 });
    }

    let commandPayload = "";

    // --- LOGIKA BARU UNTUK MEMBUAT PAYLOAD SECARA DINAMIS ---
    if (command === "create_user") {
      // Untuk create_user, kita tidak menggunakan UID dari URL.
      // Args dari body akan berisi [name, password].
      if (args.length < 2) {
        return new NextResponse(
          "Create user requires name and password in args",
          { status: 400 }
        );
      }
      commandPayload = `mode;create_user;${args[0]};${args[1]}`;
    } else {
      // Untuk perintah lain (delete_user, register_fp, dll), UID dari URL adalah parameter pertama.
      const allArgs = [uid, ...args];
      commandPayload = `mode;${command};${allArgs.join(";")}`;
    }

    // Membersihkan semicolon di akhir jika tidak ada args tambahan (cth: delete_user)
    if (commandPayload.endsWith(";")) {
      commandPayload = commandPayload.slice(0, -1);
    }

    console.log(
      `[ZKTECO_COMMAND] Sending to ${device.name}: "${commandPayload}"`
    );
    zkTecoServiceInstance.sendCommand(device.name, commandPayload);

    return NextResponse.json(
      { message: `Command '${command}' sent successfully.` },
      { status: 202 }
    );
  } catch (error: any) {
    console.error(`[ZKTECO_USER_COMMAND_POST]`, error);
    return new NextResponse(`Internal Server Error: ${error.message}`, {
      status: 500,
    });
  }
}

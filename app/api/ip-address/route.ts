// File: app/api/ip-address/route.ts
import { NextResponse } from "next/server";
// const { exec } = require('child_process'); // Uncomment jika dibutuhkan

export async function GET() {
  // TODO: Implementasikan logika untuk mendapatkan alamat IP dari server.
  // Ini sangat bergantung pada OS (Linux/Windows) tempat Next.js Anda berjalan.
  // Contoh sederhana dengan data dummy:
  const dummyInterfaces = [
    { name: "Ethernet", description: "eth0", ipAddress: "192.168.1.100" },
    { name: "WiFi", description: "wlan0", ipAddress: "192.168.1.101" },
  ];

  try {
    // Di sini Anda akan menjalankan perintah seperti 'ifconfig' atau 'ip addr'
    // dan mem-parsing outputnya untuk mendapatkan data nyata.
    return NextResponse.json(dummyInterfaces);
  } catch (error: any) {
    return NextResponse.json(
      { message: "Failed to get IP addresses", error: error.message },
      { status: 500 }
    );
  }
}

// File: app/api/system-backup/create/route.ts

import { NextResponse } from "next/server";
import axios from "axios";
import { getAuthFromCookie } from "@/lib/auth"; // Sesuaikan jika perlu otentikasi
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const auth = await getAuthFromCookie(request);

  // Check if user is admin
  if (!auth?.userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    include: { role_data: true },
  });

  if (!user || !user.role_data?.name.toLowerCase().includes('admin')) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
  const SUPABASE_PROJECT_REF = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF;

  // Validasi bahwa environment variable sudah diatur
  if (!SUPABASE_ACCESS_TOKEN || !SUPABASE_PROJECT_REF) {
    console.error("Supabase credentials are not set in .env.local");
    return NextResponse.json(
      { message: "Server configuration error: Missing Supabase credentials." },
      { status: 500 }
    );
  }

  const backupUrl = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/backups`;

  try {
    // Mengirim request ke Supabase Management API untuk memulai proses backup
    // API ini hanya memulai proses, tidak langsung selesai.
    await axios.post(
      backupUrl,
      {
        // Opsi tambahan bisa ditambahkan di sini jika diperlukan
      },
      {
        headers: {
          Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    return NextResponse.json({
      message: "Backup process has been successfully initiated.",
    });
  } catch (error: any) {
    console.error(
      "Failed to initiate Supabase backup:",
      error.response?.data || error.message
    );
    return NextResponse.json(
      {
        message: "Failed to initiate Supabase backup.",
        error: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}

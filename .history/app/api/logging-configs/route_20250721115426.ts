// File: app/api/logging-configs/route.ts
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function GET() {
  const configs = await prisma.loggingConfiguration.findMany({
    include: { device: true }, // Sertakan detail device
  });
  return NextResponse.json(configs);
}

// Anda bisa menambahkan fungsi POST, PUT, DELETE di sini juga

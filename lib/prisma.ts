// File: lib/prisma.ts
import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

// HAPUS SEMUA BLOK 'if (typeof window === "undefined")'
// DAN SEMUA PEMANGGILAN SERVICE DARI FILE INI

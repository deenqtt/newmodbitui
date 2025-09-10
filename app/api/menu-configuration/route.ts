import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const menuConfig = await prisma.menuConfiguration.findFirst();

    if (!menuConfig) {
      return NextResponse.json(null);
    }

    // Parse JSON string back to object
    const parsedStructure = JSON.parse(menuConfig.structure);
    return NextResponse.json(parsedStructure);
  } catch (error: any) {
    return NextResponse.json(
      { message: "Failed to fetch menu configuration.", error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();

    // Convert object to JSON string for storage
    const structureString = JSON.stringify(body);

    const existingConfig = await prisma.menuConfiguration.findFirst();
    let savedConfig;

    if (existingConfig) {
      savedConfig = await prisma.menuConfiguration.update({
        where: { id: existingConfig.id },
        data: { structure: structureString }, // Save as string
      });
    } else {
      savedConfig = await prisma.menuConfiguration.create({
        data: { structure: structureString }, // Save as string
      });
    }

    // Return parsed object to frontend
    const parsedStructure = JSON.parse(savedConfig.structure);
    return NextResponse.json(parsedStructure, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { message: "Failed to save menu configuration.", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || auth.role !== Role.ADMIN) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    await prisma.menuConfiguration.deleteMany();
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    return NextResponse.json(
      { message: "Failed to delete menu configuration.", error: error.message },
      { status: 500 }
    );
  }
}

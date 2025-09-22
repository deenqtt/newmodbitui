import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const layouts = await prisma.layout2D.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(layouts);
  } catch (error) {
    console.error("[LAYOUT2D_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, isUse, image } = body;

    if (!name) {
      return new NextResponse("Name is required", { status: 400 });
    }

    const layout = await prisma.layout2D.create({
      data: {
        name,
        isUse: isUse || false,
        image: image || null,
      },
    });

    return NextResponse.json(layout, { status: 201 });
  } catch (error) {
    console.error("[LAYOUT2D_POST]", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return new NextResponse("Layout name already exists", { status: 400 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

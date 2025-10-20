import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

// GET /api/tenants - Get all tenants
export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        locations: {
          select: {
            id: true,
            name: true,
            status: true,
            nodeType: true,
            longitude: true,
            latitude: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    // Add location count for each tenant
    const tenantsWithStats = tenants.map(tenant => ({
      ...tenant,
      locationCount: tenant.locations.length,
      activeLocations: tenant.locations.filter(loc => Boolean(loc.status) === true).length,
      inactiveLocations: tenant.locations.filter(loc => Boolean(loc.status) === false).length,
    }));

    return NextResponse.json(tenantsWithStats);
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return NextResponse.json(
      { message: "Failed to fetch tenants" },
      { status: 500 }
    );
  }
}

// POST /api/tenants - Create new tenant
export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, company, email, phone, address, status, notes } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { message: "Name and email are required" },
        { status: 400 }
      );
    }

    const newTenant = await prisma.tenant.create({
      data: {
        name,
        company,
        email,
        phone,
        address,
        status: status || "active",
        notes,
      },
      include: {
        locations: {
          select: {
            id: true,
            name: true,
            status: true,
            nodeType: true,
          },
        },
      },
    });

    return NextResponse.json({ ...newTenant, locationCount: newTenant.locations.length }, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "Tenant name or email already exists" },
        { status: 409 }
      );
    }
    console.error("Error creating tenant:", error);
    return NextResponse.json(
      { message: "Failed to create tenant" },
      { status: 500 }
    );
  }
}

// PUT /api/tenants - Bulk update (optional, for future use)
export async function PUT(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    { message: "Bulk update not supported. Use /api/tenants/[id] for individual updates" },
    { status: 405 }
  );
}

// DELETE /api/tenants - Bulk delete (optional, for future use)
export async function DELETE(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    { message: "Bulk delete not supported. Use /api/tenants/[id] for individual deletion" },
    { status: 405 }
  );
}

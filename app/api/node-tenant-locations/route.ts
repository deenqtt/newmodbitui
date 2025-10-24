import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

// GET /api/node-tenant-locations - Get all locations
export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const locations = await prisma.nodeTenantLocation.findMany({
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            company: true,
            email: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(locations);
  } catch (error) {
    console.error("Error fetching node tenant locations:", error);
    return NextResponse.json(
      { message: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}

// POST /api/node-tenant-locations - Create new location
export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, longitude, latitude, url, topic, description, status, nodeType, tenantId } = await request.json();

    if (!name || longitude === undefined || latitude === undefined) {
      return NextResponse.json(
        { message: "Name, longitude, and latitude are required" },
        { status: 400 }
      );
    }

    // Validate coordinates
    const lng = parseFloat(longitude);
    const lat = parseFloat(latitude);
    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      return NextResponse.json(
        { message: "Invalid coordinates. Longitude must be between -180 and 180, latitude between -90 and 90" },
        { status: 400 }
      );
    }

    // If tenantId is "no-tenant" or empty, set to null
    const finalTenantId = (tenantId === "no-tenant" || tenantId === "" || tenantId === null) ? null : tenantId;

    // If tenantId specified, verify tenant exists and is active
    if (finalTenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: finalTenantId },
        select: { id: true, isActive: true, name: true },
      });

      if (!tenant || !tenant.isActive) {
        return NextResponse.json(
          { message: "Invalid tenant ID or tenant is not active" },
          { status: 400 }
        );
      }
    }

    const newLocation = await prisma.nodeTenantLocation.create({
      data: {
        name,
        longitude: lng,
        latitude: lat,
        url: url || null,
        topic: topic || null,
        description: description || null,
        status: status ? status : false, // Use boolean directly
        nodeType: nodeType || "node",
        tenantId: finalTenantId,
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            company: true,
          },
        },
      },
    });

    return NextResponse.json(newLocation, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "Location name already exists" },
        { status: 409 }
      );
    }
    console.error("Error creating node tenant location:", error);
    return NextResponse.json(
      { message: "Failed to create location" },
      { status: 500 }
    );
  }
}

// PUT /api/node-tenant-locations - Bulk update (not supported)
export async function PUT(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    { message: "Bulk update not supported. Use /api/node-tenant-locations/[id] for individual updates" },
    { status: 405 }
  );
}

// DELETE /api/node-tenant-locations - Bulk delete (not supported)
export async function DELETE(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    { message: "Bulk delete not supported. Use /api/node-tenant-locations/[id] for individual deletion" },
    { status: 405 }
  );
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

// GET /api/node-tenant-locations/[id] - Get location by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const location = await prisma.nodeTenantLocation.findUnique({
      where: { id: params.id },
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
    });

    if (!location) {
      return NextResponse.json(
        { message: "Location not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(location);
  } catch (error) {
    console.error("Error fetching node tenant location:", error);
    return NextResponse.json(
      { message: "Failed to fetch location" },
      { status: 500 }
    );
  }
}

// PUT /api/node-tenant-locations/[id] - Update location by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const updatedLocation = await prisma.nodeTenantLocation.update({
      where: { id: params.id },
      data: {
        name,
        longitude: lng,
        latitude: lat,
        url: url || null,
        topic: topic || null,
        description: description || null,
        status: status !== undefined ? status : false,
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

    return NextResponse.json(updatedLocation);
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { message: "Location not found" },
        { status: 404 }
      );
    }
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "Location name already exists" },
        { status: 409 }
      );
    }
    console.error("Error updating node tenant location:", error);
    return NextResponse.json(
      { message: "Failed to update location" },
      { status: 500 }
    );
  }
}

// DELETE /api/node-tenant-locations/[id] - Delete location by ID (hard delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const deletedLocation = await prisma.nodeTenantLocation.delete({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });

    return NextResponse.json({
      message: "Location deleted successfully",
      location: deletedLocation
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { message: "Location not found" },
        { status: 404 }
      );
    }
    console.error("Error deleting node tenant location:", error);
    return NextResponse.json(
      { message: "Failed to delete location" },
      { status: 500 }
    );
  }
}

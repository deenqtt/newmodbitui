import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

// GET /api/tenants/[id] - Get tenant by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: params.id },
      include: {
        locations: {
          select: {
            id: true,
            name: true,
            status: true,
            nodeType: true,
            longitude: true,
            latitude: true,
            topic: true,
            url: true,
            description: true,
          },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    // Add location stats
    const tenantWithStats = {
      ...tenant,
      locationCount: tenant.locations.length,
      activeLocations: tenant.locations.filter(loc => Boolean(loc.status) === true).length,
      inactiveLocations: tenant.locations.filter(loc => Boolean(loc.status) === false).length,
    };

    return NextResponse.json(tenantWithStats);
  } catch (error) {
    console.error("Error fetching tenant:", error);
    return NextResponse.json(
      { message: "Failed to fetch tenant" },
      { status: 500 }
    );
  }
}

// PUT /api/tenants/[id] - Update tenant by ID
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const updatedTenant = await prisma.tenant.update({
      where: { id: params.id },
      data: {
        name,
        company,
        email,
        phone,
        address,
        status,
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

    return NextResponse.json({
      ...updatedTenant,
      locationCount: updatedTenant.locations.length
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "Tenant name or email already exists" },
        { status: 409 }
      );
    }
    console.error("Error updating tenant:", error);
    return NextResponse.json(
      { message: "Failed to update tenant" },
      { status: 500 }
    );
  }
}

// DELETE /api/tenants/[id] - Delete tenant by ID (soft delete by setting isActive)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if tenant has locations
    const tenantWithLocations = await prisma.tenant.findUnique({
      where: { id: params.id },
      include: {
        locations: {
          select: { id: true },
        },
      },
    });

    if (!tenantWithLocations) {
      return NextResponse.json(
        { message: "Tenant not found" },
        { status: 404 }
      );
    }

    if (tenantWithLocations.locations.length > 0) {
      return NextResponse.json(
        {
          message: "Cannot delete tenant with existing locations. Please remove all locations first or transfer them to another tenant."
        },
        { status: 409 }
      );
    }

    // Soft delete by setting isActive to false (for audit trail)
    const deletedTenant = await prisma.tenant.update({
      where: { id: params.id },
      data: {
        isActive: false,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });

    return NextResponse.json({
      message: "Tenant deleted successfully",
      tenant: deletedTenant
    });
  } catch (error: any) {
    console.error("Error deleting tenant:", error);
    return NextResponse.json(
      { message: "Failed to delete tenant" },
      { status: 500 }
    );
  }
}

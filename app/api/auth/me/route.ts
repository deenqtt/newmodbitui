import { NextResponse, NextRequest } from "next/server";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const tokenCookie = (request.headers.get("cookie") || "").match(
    /authToken=([^;]+)/
  );

  if (!tokenCookie) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  try {
    const payload = jwt.verify(tokenCookie[1], process.env.JWT_SECRET!) as any;

    // Validate user exists in database
    if (payload.userId) {
      // First get the user to check roleId
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, roleId: true }
      });

      if (!user) {
        return NextResponse.json({ message: "User not found" }, { status: 401 });
      }

      // Then get the role separately
      const role = await prisma.role.findUnique({
        where: { id: user.roleId! }
      });

      return NextResponse.json({
        userId: payload.userId,
        email: payload.email,
        role: role?.name || 'user',
        isAuthenticated: true
      });
    }

    return NextResponse.json({ message: "Invalid token payload" }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ message: "Invalid token" }, { status: 401 });
  } finally {
    await prisma.$disconnect();
  }
}

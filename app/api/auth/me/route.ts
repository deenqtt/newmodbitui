// File: app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export async function GET(request: Request) {
  const tokenCookie = (request.headers.get("cookie") || "").match(
    /authToken=([^;]+)/
  );

  if (!tokenCookie) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  try {
    const payload = jwt.verify(tokenCookie[1], process.env.JWT_SECRET!) as any;
    return NextResponse.json({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    });
  } catch (error) {
    return NextResponse.json({ message: "Invalid token" }, { status: 401 });
  }
}

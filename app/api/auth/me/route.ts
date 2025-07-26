// File: app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
};

export async function GET(request: Request) {
  const tokenCookie = (request.headers.get("cookie") || "").match(
    /authToken=([^;]+)/
  );

  if (!tokenCookie) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  try {
    const { payload } = await jwtVerify(tokenCookie[1], getJwtSecretKey());
    return NextResponse.json({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    });
  } catch (error) {
    return NextResponse.json({ message: "Invalid token" }, { status: 401 });
  }
}

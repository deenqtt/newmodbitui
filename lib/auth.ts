// File: lib/auth.ts
import { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

interface AuthPayload {
  userId: string;
  role: string;
  email: string;
  iat: number;
  exp: number;
}

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set in environment variables");
  }
  return new TextEncoder().encode(secret);
};

/**
 * Fungsi helper untuk mendapatkan dan memverifikasi data otentikasi dari cookie sebuah request.
 * @param request Objek Request yang masuk.
 * @returns Promise yang berisi payload otentikasi jika token valid, atau null jika tidak.
 */
export async function getAuthFromCookie(
  request: Request | NextRequest
): Promise<AuthPayload | null> {
  // Ambil cookie 'authToken' dari header 'cookie'
  let cookieHeader = "";

  // Handle both Request and NextRequest objects
  if (request instanceof Request) {
    cookieHeader = request.headers.get("cookie") || "";
  } else {
    // NextRequest has a cookies property - cast to any to bypass type checking
    const tokenCookie = (request as any).cookies?.get("authToken")?.value;
    if (tokenCookie) {
      cookieHeader = `authToken=${tokenCookie}`;
    }
  }

  const tokenCookie = cookieHeader.match(/authToken=([^;]+)/);

  if (!tokenCookie || !tokenCookie[1]) {
    return null;
  }

  const token = tokenCookie[1];

  try {
    // Verifikasi token menggunakan jose
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return payload as unknown as AuthPayload;
  } catch (error) {
    console.error("Invalid token from cookie:", error);
    return null;
  }
}

// Fungsi untuk server-side session
export async function getServerSession(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  return auth ? { userId: auth.userId, role: auth.role, email: auth.email } : null;
}

// ==============================
// PERMISSION CHECKING HELPERS
// ==============================

/**
 * Check if user has specific permission for resource and action
 * Uses the RolePermission system instead of hardcoded role checks
 */
export async function checkUserPermission(
  request: Request | NextRequest,
  resource: string,
  action: string
): Promise<boolean> {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return false;
  }

  // Admin users always have all permissions
  if (auth.role === 'ADMIN') {
    return true;
  }

  try {
    // Dynamic import to avoid circular dependencies
    const { prisma } = await import('@/lib/prisma');

    // Check if user has the required permission through their role
    const userPermissions = await prisma.rolePermission.findFirst({
      where: {
        role: {
          users: {
            some: {
              id: auth.userId
            }
          }
        },
        permission: {
          resource: resource,
          action: action
        }
      }
    });

    return !!userPermissions;
  } catch (error) {
    console.error('Permission check failed:', error);
    return false;
  }
}

// Helper to require authentication
export async function requireAuth(request: Request | NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    throw new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  return auth;
}

// Helper to require specific permission
export async function requirePermission(
  request: Request | NextRequest,
  resource: string,
  action: string
) {
  const hasPermission = await checkUserPermission(request, resource, action);
  if (!hasPermission) {
    throw new Response(JSON.stringify({ message: "Forbidden - Insufficient permissions" }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Legacy helper for admin-only operations (should migrate to permission-based)
export async function requireAdmin(request: Request | NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    throw new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // For now, check role directly - should be migrated to permission system
  if (auth.role !== 'ADMIN') {
    throw new Response(JSON.stringify({ message: "Forbidden - Admin access required" }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return auth;
}

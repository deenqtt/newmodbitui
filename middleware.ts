import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import * as jose from 'jose'

// Define public routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/register',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/setup-admin',
  '/api/auth/me',
  '/favicon.ico',
  '/api/health'
]

// Helper function to get auth token from cookies
function getAuthToken(request: NextRequest) {
  const token = request.cookies.get('authToken')?.value
  return token
}

// Helper function to verify JWT token
async function verifyToken(token: string) {
  try {
    const secret = process.env.JWT_SECRET
    if (!secret) {
      console.error('JWT_SECRET not configured')
      return null
    }

    const secretKey = new TextEncoder().encode(secret)
    const { payload } = await jose.jwtVerify(token, secretKey)
    return payload
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for public routes and static assets
  if (
    publicRoutes.some(route => pathname.startsWith(route)) ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/public/') ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js)$/)
  ) {
    return NextResponse.next()
  }

  // Check authentication for protected routes
  const token = getAuthToken(request)

  if (!token) {
    console.log(`[Middleware] No token found for protected route: ${pathname}`)
    // No token found, redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // For API routes, let them handle authentication themselves
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Verify token for page routes
  try {
    const payload = verifyToken(token)

    if (!payload) {
      console.log(`[Middleware] Invalid token for route: ${pathname}`)
      // Token invalid, redirect to login
      const loginUrl = new URL('/login', request.url)
      const response = NextResponse.redirect(loginUrl)

      // Clear invalid cookie
      response.cookies.delete('authToken')

      return response
    }

    // Token valid, continue to protected route
    return NextResponse.next()

  } catch (error) {
    console.log(`[Middleware] Token verification error for route: ${pathname}`)
    // Error verifying token, redirect to login
    console.error('Middleware token verification error:', error)
    const loginUrl = new URL('/login', request.url)
    const response = NextResponse.redirect(loginUrl)

    // Clear invalid cookie
    response.cookies.delete('authToken')

    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth/ (handled separately for login/register)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api/auth/|_next/static|_next/image|favicon.ico|public/).*)',
  ],
}

// middleware.ts - Código corregido

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('better-auth.session_token');
  const { pathname } = request.nextUrl;

    // Rutas de acceso público (incluye sign-in y sign-up)
    const publicPaths = ['/auth/sign-in', '/auth/sign-up', '/api/auth/']; // 👈 Añadido /api/auth/
    //const publicPaths = ['/sign-in','/api/auth/'];
    // Rutas que requieren una sesión activa
    const protectedRoutes = ['/planner'];
  
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
    const isPublicPath = publicPaths.some(path => pathname.startsWith(path)); // 👈 Nueva verificación
  
    // Si estás en una ruta protegida Y no tienes sesión, redirige a /sign-in
    if (isProtectedRoute && !sessionCookie) {
      return NextResponse.redirect(new URL('/auth/sign-in', request.url));
    }
    
    // OPCIONAL: Si ya tienes sesión y tratas de ir a /sign-in o /sign-up, redirige a /planner
    if (sessionCookie && (pathname === '/auth/sign-in' || pathname === '/auth/sign-up')) {
        return NextResponse.redirect(new URL('/planner', request.url));
    }
  return NextResponse.next();
}

export const config = {
  // Mantenemos este matcher, ya que excluye /api/auth/...
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
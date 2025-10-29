// middleware.ts - Recomendado

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
// Nota: 'better-auth.session_token' puede variar. Asegúrate de que sea el nombre correcto.

export function middleware(request: NextRequest) {
    const sessionCookie = request.cookies.get('better-auth.session_token');
    const { pathname } = request.nextUrl;
    
    // Rutas protegidas
    const isProtectedRoute = pathname.startsWith('/planner');
    
    // Si estás en una ruta protegida Y no tienes sesión, redirige a /sign-in
    if (isProtectedRoute && !sessionCookie) {
        return NextResponse.redirect(new URL('/auth/sign-in', request.url));
    }
    
    // Si tienes sesión y tratas de ir a la página principal o las rutas de auth, redirige a /planner
    if (sessionCookie && (pathname === '/' || pathname.startsWith('/auth/'))) {
        return NextResponse.redirect(new URL('/planner', request.url));
    }

    return NextResponse.next();
}

export const config = {
    // Solo aplica el middleware a las rutas que quieres proteger o manejar.
    matcher: ['/', '/planner/:path*', '/auth/:path*'], 
};
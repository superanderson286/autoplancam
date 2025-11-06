import { NextResponse } from 'next/server.js';
import type { NextRequest } from 'next/server.js';
// 💡 Importar la función 'getSessionCookie' de better-auth/cookies
import { getSessionCookie } from 'better-auth/cookies'; 

export function middleware(request: NextRequest) {
    // CLAVE: Obtener la sesión usando la función síncrona de better-auth
    const sessionCookie = getSessionCookie(request); 
    const { pathname } = request.nextUrl;
    
    // Rutas protegidas
    const isProtectedRoute = pathname.startsWith('/planner');
    const isAuthPath = pathname.startsWith('/auth/sign-in');
    
    // 1. Si estás en una ruta protegida Y NO tienes sesión, redirige al login
    if (isProtectedRoute && !sessionCookie) {
        return NextResponse.redirect(new URL('/auth/sign-in', request.url));
    }
    
    // 2. Si tienes sesión Y estás en la ruta de auth o en la raíz, redirige a /planner
    if (sessionCookie && (isAuthPath || pathname === '/')) {
        return NextResponse.redirect(new URL('/planner', request.url));
    }

    return NextResponse.next();
}

export const config = {
    // El matcher es correcto
    matcher: [
        '/', 
        '/planner/:path*', 
        '/auth/:path*',
    ],
};
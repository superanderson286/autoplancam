import { NextResponse } from 'next/server.js';
import type { NextRequest } from 'next/server.js';
// 💡 Importamos la instancia completa de 'auth' para obtener la sesión con roles
import { auth } from './lib/auth';

// 👇 ESTA ES LA SOLUCIÓN
export const runtime = 'nodejs'; // O 'experimental-edge'

export async function middleware(request: NextRequest) {
    // CLAVE: Obtenemos la sesión completa de forma asíncrona para poder leer el rol del usuario
    const session = await auth.api.getSession({ headers: request.headers });
    const { pathname } = request.nextUrl;
    
    // Definimos los diferentes tipos de rutas
    const isAdminPath = pathname.startsWith('/admin');
    const isPlannerPath = pathname.startsWith('/planner');
    const isAuthPath = pathname.startsWith('/auth/sign-in');
    
    // 1. Si el usuario NO está autenticado
    if (!session) {
        // Y está intentando acceder a una ruta protegida (admin o planner), redirige al login
        if (isAdminPath || isPlannerPath) {
            return NextResponse.redirect(new URL('/auth/sign-in', request.url));
        }
        return NextResponse.next();
    }

    // 2. Si el usuario SÍ está autenticado
    // Si intenta acceder a una ruta de admin pero NO tiene el rol 'admin', redirige a planner
    if (isAdminPath && session.user?.role !== 'admin') {
        return NextResponse.redirect(new URL('/planner', request.url));
    }
    
    // Si está autenticado e intenta acceder al login o a la raíz, redirige a planner
    if (isAuthPath) {
        return NextResponse.redirect(new URL('/planner', request.url));
    }

    return NextResponse.next();
}

export const config = {
    // Añadimos la ruta de admin al matcher
    matcher: [
        '/', 
        '/planner/:path*', 
        '/auth/:path*',
        '/admin/:path*',
    ],
};
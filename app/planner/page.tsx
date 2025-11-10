// app/planner/page.tsx

"use client";

import { authClient } from "../../lib/auth-client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
// import { useTranslation } from "react-i18next";

// 👈 Importa el nuevo componente de lógica del planificador
import PlannerLogic from "./PlannerLogic"; 

// Definimos una interfaz para el usuario que incluye el rol,
// igual que en la Navbar principal.
interface UserWithRole {
  name?: string | null;
  email?: string | null;
  role?: string | null;
}

export default function PlannerPage() {
  // const { t } = useTranslation();
  const router = useRouter();
  // `better-auth` usa `isPending` y `data`, no `status`.
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    // Si la carga ha terminado y no hay sesión, el usuario no está autenticado.
    if (!isPending && !session) {
      router.push("/auth/sign-in");
    }
  }, [isPending, session, router]);

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          // Redirige a la página principal después de cerrar sesión
          router.push("/");
        },
      },
    });
  };

  return (
    // Utilizamos <main> para que el contenido de PlannerLogic tenga espacio y color
    // Reemplazamos la clase bg-gray-900 por bg-gray-100 para que PlannerLogic se vea bien
    <main className="min-h-screen bg-gray-100 p-4">
      
      {/* 1. Barra superior específica del planificador */}
      <div className="flex justify-between items-center mb-6 p-4 bg-white shadow-md rounded-lg">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-800">
              {/*t("Security Planner")*/}
              Planner
            </h1>
            {/* Renderizado condicional para el enlace de Admin */}
            {(session?.user as UserWithRole)?.role === 'admin' && (
              <Link href="/admin" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-sm transition duration-150">
                Admin
              </Link>
            )}
          </div>
          <div className="flex items-center gap-4">
            {session?.user?.name && (
              <span className="text-gray-700 font-medium hidden sm:block">
                Bienvenido, {session.user.name}
              </span>
            )}
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-sm transition duration-150"
            >
              Sign Out
            </button>
          </div>
      </div>

      {/* 2. El corazón de la aplicación: el Planificador de Lógica */}
      <PlannerLogic />
      
    </main>
  );
}
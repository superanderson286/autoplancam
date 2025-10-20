// app/planner/page.tsx

"use client";

import { signOut } from "../../lib/auth-client";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

// 👈 Importa el nuevo componente de lógica del planificador
import PlannerLogic from "./PlannerLogic"; 

export default function PlannerPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({
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
      
      {/* 1. Barra superior para el nombre y el botón de Sign Out */}
      <div className="flex justify-between items-center mb-6 p-4 bg-white shadow-md rounded-lg">
          <h1 className="text-2xl font-bold text-gray-800">
             {t("Security Planner")} 
          </h1>
          <button
            onClick={handleSignOut}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded text-sm transition duration-150"
          >
            {t("Sign Out")}
          </button>
      </div>

      {/* 2. El corazón de la aplicación: el Planificador de Lógica */}
      <PlannerLogic />
      
    </main>
  );
}
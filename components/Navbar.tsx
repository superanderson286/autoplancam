
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Button as MovingBorderButton } from "./ui/moving-border";
import { authClient } from "../lib/auth-client";

// Definimos una interfaz para el usuario que incluye el rol.
// Esto soluciona el error "Cannot find name 'UserWithRole'".
interface UserWithRole {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string | null;
}

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const { data: session } = authClient.useSession();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setIsMenuOpen(false);
  };

  const changeLanguage = (lng: string) => {
    if (typeof i18n.changeLanguage === "function") {
      i18n.changeLanguage(lng);
    } else {
      console.warn("i18n.changeLanguage is not a function");
    }
  };

  return (
    <nav className="fixed top-0 left-0 w-full bg-gray-900 text-white py-4 px-6 z-50 shadow-md">
      <div className="flex justify-between items-center">
        <div className="hidden md:block text-xl font-bold">AutoPlanCam</div>
        <div className="hidden md:flex gap-6 text-sm font-medium">
          <div className="cursor-pointer hover:text-blue-400" onClick={() => scrollTo("features")}>{t("Features")}</div>
          <div className="cursor-pointer hover:text-blue-400" onClick={() => scrollTo("tech")}>{t("Technology")}</div>
          <div className="cursor-pointer hover:text-blue-400" onClick={() => scrollTo("benefits")}>{t("Benefits")}</div>
          <div className="cursor-pointer hover:text-blue-400" onClick={() => scrollTo("roadmap")}>{t("Roadmap")}</div>
          <MovingBorderButton
            as="a"
            href="/trial"
            borderRadius="1rem"
            containerClassName="h-8 w-24 md:h-10 md:w-28"
            className="text-xs md:text-sm flex items-center justify-center"
            borderClassName="bg-[linear-gradient(to_right,#0ea5e9,#06b6d4)]"
          >
            {t("Request Trial")}
          </MovingBorderButton>
          {/* Renderizado condicional para el enlace de Admin */}
          {(session?.user as UserWithRole)?.role === 'admin' && (
            <Link href="/admin" className="cursor-pointer hover:text-blue-400">{t("Admin")}</Link>
          )}
        </div>
        <div className="hidden md:flex items-center gap-4">
          <button onClick={() => changeLanguage('es')} className="text-sm font-medium hover:text-blue-400">{t("Spanish")}</button>
          <button onClick={() => changeLanguage('en')} className="text-sm font-medium hover:text-blue-400">{t("English")}</button>
          {/* Botones de Iniciar/Cerrar Sesión */}
          {session && (
            <button
              onClick={async () => {
                await authClient.signOut({
                  fetchOptions: {
                    onSuccess: () => router.push('/'),
                  },
                });
              }}
              className="text-sm font-medium hover:text-blue-400"
            >
              {t("Sign Out")}
            </button>
          )}
        </div>
        <div className="md:hidden flex items-center">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-white focus:outline-none">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path>
            </svg>
          </button>
        </div>
      </div>
      {isMenuOpen && (
        <div className="md:hidden mt-4">
          <div className="flex flex-col gap-4 text-sm font-medium">
            <div className="cursor-pointer hover:text-blue-400" onClick={() => scrollTo("features")}>{t("Features")}</div>
            <div className="cursor-pointer hover:text-blue-400" onClick={() => scrollTo("tech")}>{t("Technology")}</div>
            <div className="cursor-pointer hover:text-blue-400" onClick={() => scrollTo("benefits")}>{t("Benefits")}</div>
            <div className="cursor-pointer hover:text-blue-400" onClick={() => scrollTo("roadmap")}>{t("Roadmap")}</div>
            <MovingBorderButton
              as="a"
              href="/trial"
              borderRadius="1rem"
              containerClassName="h-8 w-24 md:h-10 md:w-28"
              className="text-xs md:text-base flex items-center justify-center"
              borderClassName="bg-[linear-gradient(to_right,#0ea5e9,#06b6d4)]"
            >
              {t("Request Trial")}
            </MovingBorderButton>
            {/* Renderizado condicional para el enlace de Admin en menú móvil */}
            {(session?.user as UserWithRole)?.role === 'admin' && (
              <Link href="/admin" className="cursor-pointer hover:text-blue-400">{t("Admin")}</Link>
            )}
            <div className="flex gap-4 mt-4">
              <button onClick={() => changeLanguage('es')} className="text-sm font-medium hover:text-blue-400">{t("Spanish")}</button>
              <button onClick={() => changeLanguage('en')} className="text-sm font-medium hover:text-blue-400">{t("English")}</button>
            </div>
            {/* Botones de Iniciar/Cerrar Sesión en menú móvil */}
            <div className="mt-4">
              {session && (
                <button
                  onClick={async () => {
                    await authClient.signOut({
                      fetchOptions: {
                        onSuccess: () => router.push('/'),
                      },
                    });
                  }}
                  className="text-sm font-medium hover:text-blue-400 w-full text-left"
                >
                  {t("Sign Out")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

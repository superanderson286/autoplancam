import { useTranslation } from "react-i18next";
import { useState } from "react";

export default function Navbar() {
  const { t, i18n } = useTranslation(); // Si usas namespaces: useTranslation("common")
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
        <div className="hidden md:flex gap-6 text-sm font-medium">
          <div className="cursor-pointer hover:text-blue-400" onClick={() => scrollTo("features")}>{t("Features")}</div>
          <div className="cursor-pointer hover:text-blue-400" onClick={() => scrollTo("tech")}>{t("Technology")}</div>
          <div className="cursor-pointer hover:text-blue-400" onClick={() => scrollTo("benefits")}>{t("Benefits")}</div>
          <div className="cursor-pointer hover:text-blue-400" onClick={() => scrollTo("roadmap")}>{t("Roadmap")}</div>
        </div>
        <div className="hidden md:flex gap-4">
          <button onClick={() => changeLanguage('es')} className="text-sm font-medium hover:text-blue-400">Español</button>
          <button onClick={() => changeLanguage('en')} className="text-sm font-medium hover:text-blue-400">English</button>
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
            <div className="flex gap-4 mt-4">
              <button onClick={() => changeLanguage('es')} className="text-sm font-medium hover:text-blue-400">Español</button>
              <button onClick={() => changeLanguage('en')} className="text-sm font-medium hover:text-blue-400">English</button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
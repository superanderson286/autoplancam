import { useTranslation } from "react-i18next";

export default function Navbar() {
  const { t, i18n } = useTranslation();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <nav className="fixed top-0 left-0 w-full bg-gray-900 text-white py-4 px-6 z-50 shadow-md">
      <div className="flex justify-between items-center">
        <ul className="flex gap-6 text-sm font-medium">
          <li className="cursor-pointer hover:text-blue-400" onClick={() => scrollTo("features")}>{t("Características")}</li>
          <li className="cursor-pointer hover:text-blue-400" onClick={() => scrollTo("tech")}>{t("Tecnología")}</li>
          <li className="cursor-pointer hover:text-blue-400" onClick={() => scrollTo("benefits")}>{t("Beneficios")}</li>
          <li className="cursor-pointer hover:text-blue-400" onClick={() => scrollTo("roadmap")}>{t("Roadmap")}</li>
        </ul>
        <div className="flex gap-4">
          <button onClick={() => changeLanguage('es')} className="text-sm font-medium hover:text-blue-400">Español</button>
          <button onClick={() => changeLanguage('en')} className="text-sm font-medium hover:text-blue-400">English</button>
        </div>
      </div>
    </nav>
  );
}
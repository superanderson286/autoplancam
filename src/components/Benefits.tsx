import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function Benefits() {
  const { t } = useTranslation();

  return (
    <section id="benefits" className="bg-white py-16 px-8">
      <h2 className="text-3xl font-bold text-center mb-8">{t("Beneficios clave")}</h2>
      <div className="grid md:grid-cols-2 gap-8 text-lg">
        <motion.ul className="space-y-3" initial={{ y: 50, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }}>
          <li>{t("🔧 Reducción de tiempo hasta 80%")}</li>
          <li>{t("🎯 Precisión en cobertura y materiales")}</li>
          <li>{t("📄 Documentación profesional")}</li>
          <li>{t("📦 Escalabilidad para proyectos grandes")}</li>
        </motion.ul>
        <motion.ul className="space-y-3" initial={{ y: 50, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          <li>{t("🏢 Empresas de instalación")}</li>
          <li>{t("👷 Ingenieros de proyecto")}</li>
          <li>{t("🕵️ Consultores de seguridad")}</li>
          <li>{t("🏠 Clientes finales")}</li>
        </motion.ul>
      </div>
    </section>
  );
}
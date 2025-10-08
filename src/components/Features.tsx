import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function Features() {
  const { t } = useTranslation();

  return (
    <section id="features" className="grid md:grid-cols-2 gap-8 px-8 py-16 bg-white text-gray-900">
      <motion.div
        initial={{ x: -50, opacity: 0 }}
        whileInView={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl font-bold mb-4">{t("¿Por qué AutoPlanCam?")}</h2>
        <ul className="space-y-3 text-lg">
          <li>{t("⏱️ Planificación manual = tiempo perdido")}</li>
          <li>{t("❌ Errores humanos en cálculos")}</li>
          <li>{t("📄 Documentación inconsistente")}</li>
        </ul>
      </motion.div>
      <motion.div
        initial={{ x: 50, opacity: 0 }}
        whileInView={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-3xl font-bold mb-4">{t("La solución")}</h2>
        <ul className="space-y-3 text-lg">
          <li>{t("🤖 Recomendación automática de cámaras")}</li>
          <li>{t("📐 Generación de planos y materiales")}</li>
          <li>{t("📤 Reportes técnicos y comerciales exportables")}</li>
        </ul>
      </motion.div>
    </section>
  );
}
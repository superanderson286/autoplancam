import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function Roadmap() {
  const { t } = useTranslation();

  const roadmap = [t("✅ MVP funcional"), t("📦 Base de datos Hikvision"), t("🧪 Validación con instaladores"), t("🚀 Lanzamiento beta")];

  return (
    <section id="roadmap" className="bg-gray-900 text-white py-16 px-8">
      <h2 className="text-3xl font-bold text-center mb-8">{t("Próximos pasos")}</h2>
      <div className="grid md:grid-cols-4 gap-6 text-center text-lg">
        {roadmap.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.2 }}
          >
            {item}
          </motion.div>
        ))}
      </div>
      <footer className="mt-12 text-center text-sm text-gray-400">
        {t("© 2025 AutoPlanCam. Desarrollado con ❤️ por Anderson Software & Solutions.")}
      </footer>
    </section>
  );
}
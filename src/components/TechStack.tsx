import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function TechStack() {
  const { t } = useTranslation();

  const tech = [t("🦀 Rust Backend"), t("🎨 React + Tailwind"), t("🗄️ PostgreSQL / SQLite"), t("🖥️ Tauri Desktop Ready")];

  return (
    <section id="tech" className="bg-gray-100 py-16 px-8 text-center">
      <h2 className="text-3xl font-bold mb-8">{t("Tecnología que impulsa AutoPlanCam")}</h2>
      <div className="grid md:grid-cols-4 gap-6 text-lg">
        {tech.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.2 }}
          >
            {item}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
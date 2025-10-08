import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function Hero() {
  const { t } = useTranslation();

  return (
    <section className="h-screen bg-gray-950 text-white flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="text-center"
      >
        <h1 className="text-5xl font-bold mb-4">AutoPlanCam</h1>
        <p className="text-xl text-gray-300 mb-6">
          {t("Automatiza proyectos de videovigilancia con precisión y estilo")}
        </p>
        <motion.button
          whileHover={{ scale: 1.1 }}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-full font-semibold"
        >
          {t("Ver demo")}
        </motion.button>
      </motion.div>
    </section>
  );
}
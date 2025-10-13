import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function Hero() {
  const { t } = useTranslation();

  const handleDemoClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const plannerSection = document.getElementById("planner");
    if (plannerSection) {
      plannerSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="h-screen bg-gray-950 text-white flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="text-center px-4"
      >
        <h1 className="text-3xl md:text-5xl font-bold mb-4">AutoPlanCam</h1>
        <p className="text-lg md:text-xl text-gray-300 mb-6">
          {t("Automatiza proyectos de videovigilancia con precisión y estilo")}
        </p>
        <motion.button
          onClick={handleDemoClick}
          whileHover={{ scale: 1.1 }}
          className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-full font-semibold"
        >
          {t("Ver demo")}
        </motion.button>
      </motion.div>
    </section>
  );
}
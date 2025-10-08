import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const containerVariants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: {
    y: 50,
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
    },
  },
};

const benefits = [
  "🔧 Reducción de tiempo hasta 80%",
  "🎯 Precisión en cobertura y materiales",
  "📄 Documentación profesional",
  "📦 Escalabilidad para proyectos grandes",
];

const targetAudience = [
  "🏢 Empresas de instalación",
  "👷 Ingenieros de proyecto",
  "🕵️ Consultores de seguridad",
  "🏠 Clientes finales",
];

export default function Benefits() {
  const { t } = useTranslation();

  return (
    <section id="benefits" className="bg-white py-16 px-8">
      <h2 className="text-3xl font-bold text-center mb-8">{t("Beneficios clave")}</h2>
      <div className="grid md:grid-cols-2 gap-8 text-lg">
        <motion.div
          className="space-y-4"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              className="bg-gray-100 p-6 rounded-lg shadow-md"
              variants={cardVariants}
              whileHover={{ scale: 1.05 }}
            >
              {t(benefit)}
            </motion.div>
          ))}
        </motion.div>
        <motion.div
          className="space-y-4"
          initial="hidden"
          animate="visible"
          variants={containerVariants}
        >
          {targetAudience.map((audience, index) => (
            <motion.div
              key={index}
              className="bg-gray-100 p-6 rounded-lg shadow-md"
              variants={cardVariants}
              whileHover={{ scale: 1.05 }}
            >
              {t(audience)}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
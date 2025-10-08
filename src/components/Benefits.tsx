import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const containerVariants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.3,
    },
  },
};

const cardVariants = {
  hidden: (direction: 'left' | 'right') => ({
    opacity: 0,
    x: direction === 'left' ? -100 : 100,
  }),
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 10,
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
          whileInView="visible"
          viewport={{ once: false, amount: 0.3 }}
          variants={containerVariants}
          custom="left"
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
          whileInView="visible"
          viewport={{ once: false, amount: 0.3 }}
          variants={containerVariants}
          custom="right"
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
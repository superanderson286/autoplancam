import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function Monetization() {
  const { t } = useTranslation();

  return (
    <section className="bg-blue-600 text-white py-16 px-8 text-center">
      <motion.h2 className="text-3xl font-bold mb-4" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}>
        {t("Disponible en versión gratuita y premium")}
      </motion.h2>
      <motion.p className="text-lg mb-6" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        {t("Licencia por proyecto, suscripción mensual o donaciones vía Ko-fi, PayPal y Cripto")}
      </motion.p>
    </section>
  );
}
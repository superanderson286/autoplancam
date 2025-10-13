import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function Planner() {
  const { t } = useTranslation();
  const [area, setArea] = useState("");
  const [height, setHeight] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const handlePlan = () => {
    // Simulación de lógica de recomendación
    const recommended = t('recommendationResult', { area, height });
    setResult(recommended);
  };

  return (
    <section id="planner" className="bg-gray-100 py-16 px-6">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-lg"
      >
        <h2 className="text-2xl font-bold mb-6 text-center">{t('autoPlanCamPlanner')}</h2>
        <div className="grid gap-4 mb-6">
          <input
            type="number"
            placeholder={t('area_m2')}
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="border px-4 py-2 rounded"
          />
          <input
            type="number"
            placeholder={t('height_m')}
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="border px-4 py-2 rounded"
          />
          <button
            onClick={handlePlan}
            className="bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            {t('recommendCameras')}
          </button>
        </div>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-green-100 p-4 rounded text-green-800"
          >
            {result}
          </motion.div>
        )}
      </motion.div>
    </section>
  );
}
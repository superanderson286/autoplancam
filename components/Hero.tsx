import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { Button as MovingBorderButton } from "./ui/moving-border";

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
          {t("Automate video surveillance projects with precision and style")}
        </p>
        <div className="flex justify-center space-x-4">
          <motion.button
            onClick={handleDemoClick}
            whileHover={{ scale: 1.1 }}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-full font-semibold"
          >
            {t("View demo")}
          </motion.button>
          <MovingBorderButton
            as="a"
            href="/auth/sign-in"
            borderRadius="1.75rem"
            borderClassName="bg-[linear-gradient(to_right,#0ea5e9,#06b6d4)]"
          >
            {t("Sign In")}
          </MovingBorderButton>
        </div>
      </motion.div>
    </section>
  );
}
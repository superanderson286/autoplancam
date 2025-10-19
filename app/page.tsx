"use client"; // This component uses state (useState), so it must be a client component.

import { motion } from "framer-motion";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Features from "../components/Features";
import TechStack from "../components/TechStack";
import Benefits from "../components/Benefits";
import Monetization from "../components/Monetization";
import Roadmap from "../components/Roadmap";
import KoFiWidget from "../components/KoFiWidget";
import Planner from "../components/app/Planner";
import { Button as MovingBorderButton } from "../components/ui/moving-border";

export default function HomePage() { // Renamed from App
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* The <Head> component is removed */}
      <Navbar />

      <div className="flex justify-center space-x-4 my-8">
        <Link href="/auth/sign-in">
          <MovingBorderButton
            borderRadius="1.75rem"
            className="bg-white dark:bg-slate-900 text-black dark:text-white border-neutral-200 dark:border-slate-800"
          >
            Sign In
          </MovingBorderButton>
        </Link>
        <Link href="/auth/sign-up">
          <MovingBorderButton
            borderRadius="1.75rem"
            className="bg-white dark:bg-slate-900 text-black dark:text-white border-neutral-200 dark:border-slate-800"
          >
            Sign Up
          </MovingBorderButton>
        </Link>
      </div>

      <Hero />
      <Features />
      <Planner />
      <TechStack />
      <Benefits />
      <Monetization />
      <Roadmap />
      <KoFiWidget />
    </motion.div>
  );
}

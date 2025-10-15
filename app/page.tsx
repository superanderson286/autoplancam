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

export default function HomePage() { // Renamed from App
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* The <Head> component is removed */}
      <Navbar />
      <div style={{ padding: '2rem', border: '1px solid #ccc', margin: '2rem' }}>
        <Link href="/sign-in">Go to Sign In Page</Link>
        <br />
        <Link href="/sign-up">Go to Sign Up Page</Link>
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

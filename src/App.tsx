import { motion } from "framer-motion";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Features from "./components/Features";
import TechStack from "./components/TechStack";
import Benefits from "./components/Benefits";
import Monetization from "./components/Monetization";
import Roadmap from "./components/Roadmap";

function App() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <Navbar />
      <Hero />
      <Features />
      <TechStack />
      <Benefits />
      <Monetization />
      <Roadmap />
    </motion.div>
  );
}

export default App;
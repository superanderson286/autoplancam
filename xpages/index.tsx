import { motion } from "framer-motion";
import Head from "next/head";
import { useState } from "react";
import { authClient } from "../lib/auth-client";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Features from "../components/Features";
import TechStack from "../components/TechStack";
import Benefits from "../components/Benefits";
import Monetization from "../components/Monetization";
import Roadmap from "../components/Roadmap";
import KoFiWidget from "../components/KoFiWidget";
import Planner from "../components/app/Planner";

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignUp = async () => {
    const { error } = await authClient.signUp.email({
      email,
      password,
    });
    if (error) {
      alert(`Sign-up error: ${error.message}`);
    } else {
      alert("Sign-up successful! Please check your email to verify your account.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      <Head>
        <title>AutoPlanCam</title>
        <link rel="icon" href="data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12 10C13.1046 10 14 9.10457 14 8C14 6.89543 13.1046 6 12 6C10.8954 6 10 6.89543 10 8C10 9.10457 10.8954 10 12 10Z' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M18 10V8C18 5.79086 16.2091 4 14 4H10C7.79086 4 6 5.79086 6 8V10' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M20 12H4C3.44772 12 3 12.4477 3 13V18C3 18.5523 3.44772 19 4 19H20C20.5523 19 21 18.5523 21 18V13C21 12.4477 20.5523 12 20 12Z' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3Cpath d='M12 19V22' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E" />
      </Head>
      <Navbar />
      <div style={{ padding: '2rem', border: '1px solid #ccc', margin: '2rem' }}>
        <h2>Test Sign Up</h2>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ display: 'block', margin: '0.5rem 0', padding: '0.5rem' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ display: 'block', margin: '0.5rem 0', padding: '0.5rem' }}
        />
        <button onClick={handleSignUp} style={{ padding: '0.5rem 1rem' }}>Sign Up</button>
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

export default App;
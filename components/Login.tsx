import React, { useState, useEffect } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Globe } from "lucide-react";

interface LoginProps {
  onLoginSuccess: () => void;
}

const CORRECT_PASSWORD = "tisseoiv";

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      setError("");
      onLoginSuccess();
    } else {
      setError("Mot de passe incorrect.");
      setPassword("");
    }
  };

  // 💡 Gestion du halo dynamique
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const translateX = useTransform(mouseX, [0, window.innerWidth], [-30, 30]);
  const translateY = useTransform(mouseY, [0, window.innerHeight], [-30, 30]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  const backgroundStyle: React.CSSProperties = {
    backgroundImage: `
      linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
    `,
    backgroundSize: "40px 40px",
  };

  return (
    <div
      className="relative flex flex-col min-h-screen overflow-hidden bg-gray-100 dark:bg-slate-950 transition-colors"
      style={backgroundStyle}
    >
      {/* 💫 Halo dynamique */}
      <motion.div
        className="absolute w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{
          x: translateX,
          y: translateY,
          background:
            "radial-gradient(circle at center, rgba(20,184,166,0.2), transparent 70%)",
          filter: "blur(120px)",
          zIndex: 0,
        }}
      />

      {/* 🔦 Rayon lumineux “scanner” */}
      <motion.div
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(20,184,166,0.15), transparent)",
          zIndex: 0,
        }}
        animate={{ backgroundPositionX: ["0%", "100%"] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      />

      {/* 🌌 Halo fixe pour profondeur */}
      <motion.div
        className="absolute w-[900px] h-[900px] rounded-full bottom-[-250px] left-[-250px] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at center, rgba(56,189,248,0.25), transparent 70%)",
          filter: "blur(180px)",
          zIndex: 0,
        }}
        animate={{
          scale: [1, 1.05, 0.95, 1],
          opacity: [0.8, 1, 0.9, 0.8],
        }}
        transition={{
          duration: 35,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* 💻 Contenu principal */}
      <main className="relative flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2 }}
          className="w-full max-w-md p-8 space-y-8 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-300 dark:border-slate-700 rounded-xl shadow-[0_0_40px_rgba(20,184,166,0.2)]"
        >
          <div className="text-center">
            <Globe className="h-10 w-10 mx-auto text-teal-600 dark:text-teal-400 drop-shadow-[0_0_10px_rgba(20,184,166,0.5)]" />
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-slate-100">
              Portail d'Audit Tisséo
            </h2>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="password" className="sr-only">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="relative block w-full appearance-none rounded-md bg-white/80 dark:bg-slate-800/60 px-3 py-2 text-gray-900 dark:text-slate-100 placeholder-gray-500 dark:placeholder-slate-400 ring-1 ring-inset ring-gray-400 dark:ring-slate-600 focus:ring-2 focus:ring-teal-600 dark:focus:ring-teal-400 sm:text-sm backdrop-blur-sm transition"
                placeholder="Mot de passe"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              className="group relative flex w-full justify-center rounded-md border border-transparent bg-teal-600 py-2 px-4 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950 transition"
            >
              Se connecter
            </button>
          </form>
        </motion.div>
      </main>

      <footer className="relative z-10 text-center py-6 text-gray-500 dark:text-slate-400 text-xs">
        <p>
          AuditRef © 2025 - Tous droits réservés |{" "}
          <a
            href="mailto:florent.perez@tisseo.fr?subject=Contact%20depuis%20AuditRef"
            className="text-teal-600 dark:text-teal-400 hover:underline"
          >
            Contact
          </a>{" "}
          | 72 76
        </p>
      </footer>
    </div>
  );
};

export default Login;

import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Eye,
  EyeOff,
  Lock,
  ArrowRight,
  WifiOff,
  ShieldCheck,
  Zap,
  Download,
  ClipboardCheck,
  BookOpenCheck,
  AlertTriangle,
  Archive,
} from "lucide-react";
import { Logo } from "./Logo";
import { pageVariants } from "../hooks/motion/transitions";

interface LoginProps {
  onLoginSuccess: () => void;
}

const CORRECT_PASSWORD = "tisseoiv";

/** Généalogie produit réelle (cf. data/appInfo.ts::APP_PIPELINE) — mêmes
 *  étapes que l'à propos, jamais un texte marketing inventé séparément.
 *  4 items (comme la référence visuelle), pas les 5 — "Résumé
 *  d'intervention" est une sous-étape trop fine pour un badge de hero. */
const PIPELINE_BADGES = [
  { label: "Audit terrain", Icon: ClipboardCheck },
  { label: "Référentiel signalétique", Icon: BookOpenCheck },
  { label: "Analyse des anomalies", Icon: AlertTriangle },
  { label: "Historique", Icon: Archive },
];

/** Fonctionnalités réellement vraies aujourd'hui — pas de promesse
 *  (sécurité serveur, export XLSX/PDF) que l'app ne tient pas : c'est un
 *  mot de passe partagé côté client et un export CSV + sauvegarde JSON. */
const FEATURES = [
  { label: "Mode hors ligne", desc: "Travaillez partout, même sans réseau.", Icon: WifiOff },
  { label: "Données locales", desc: "Rien ne quitte l'appareil sans export volontaire.", Icon: ShieldCheck },
  { label: "Simple à utiliser", desc: "Conçu pour le terrain, pas pour un bureau.", Icon: Zap },
  { label: "Export & sauvegarde", desc: "CSV et sauvegarde JSON en un clic.", Icon: Download },
];

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [heroImageFailed, setHeroImageFailed] = useState(false);

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

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-neutral-950">
      {/* ============ Hero — identité de marque, volontairement fixe
          (indépendante du thème clair/sombre de l'app : un écran de
          connexion premium à part, cf. audit) ============ */}
      <div className="relative overflow-hidden bg-neutral-950 px-6 py-8 sm:px-10 sm:py-10 lg:w-1/2 lg:px-14 lg:py-16 flex flex-col">
        {/* Texture décorative légère — CSS pur, aucune image à charger */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(20,184,166,0.15) 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden="true"
        />
        <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-teal-600/20 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-64 w-64 rounded-full bg-teal-500/10 blur-3xl" aria-hidden="true" />

        {/* Logo — composant partagé inchangé (teal), réutilisé tel quel */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-teal-500/10 ring-1 ring-teal-500/30">
            <Logo className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-bold tracking-tight text-white">AuditRef</p>
            <p className="text-[11px] font-medium uppercase tracking-widest text-teal-400">Auditer · Contrôler · Valoriser</p>
          </div>
        </div>

        <div className="relative mt-8 lg:mt-16 max-w-md">
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-white">
            Des audits terrain plus simples, plus rapides, plus fiables.
          </h1>
          <p className="mt-3 text-sm text-neutral-400 hidden sm:block">
            La plateforme de gestion et d'analyse de la signalétique Information Voyageur, pensée pour le terrain.
          </p>
        </div>

        {/* Photo terrain réelle (recadrée depuis le visuel de référence,
            sans le faux formulaire ni les badges/mascotte fictifs) —
            desktop uniquement, poids négligeable (~45 Ko), dégradée vers
            le panneau si elle ne charge pas (cf. audit performance). */}
        {!heroImageFailed && (
          <div className="relative mt-8 hidden lg:block overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10">
            <img
              src="/images/login-hero.jpg"
              alt="Agent sur le terrain consultant l'application AuditRef sur une tablette"
              className="h-56 w-full object-cover"
              loading="eager"
              decoding="async"
              onError={() => setHeroImageFailed(true)}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent to-neutral-950/80" />
          </div>
        )}

        {/* Étapes du pipeline produit — masquées sur mobile pour garder le
            hero compact (le formulaire reste la priorité, cf. audit). */}
        <div className="relative mt-8 hidden sm:grid grid-cols-2 gap-3 max-w-md">
          {PIPELINE_BADGES.map(({ label, Icon }) => (
            <div key={label} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-3">
              <Icon className="h-4 w-4 flex-shrink-0 text-teal-400" aria-hidden="true" />
              <span className="text-xs font-medium text-neutral-200">{label}</span>
            </div>
          ))}
        </div>

        <p className="relative mt-8 hidden lg:block text-sm italic text-neutral-500">
          Plus qu'un outil, une solution terrain.
        </p>

        {/* Bandeau de fonctionnalités — desktop uniquement (pied du hero) */}
        <div className="relative mt-auto pt-10 hidden lg:grid grid-cols-2 gap-x-6 gap-y-5">
          {FEATURES.map(({ label, desc, Icon }) => (
            <div key={label} className="flex items-start gap-2.5">
              <Icon className="h-4 w-4 flex-shrink-0 text-teal-500 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-xs font-semibold text-white">{label}</p>
                <p className="mt-0.5 text-[11px] text-neutral-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============ Formulaire de connexion — logique inchangée ============ */}
      <div className="flex justify-center bg-neutral-950 px-4 py-10 sm:px-6 lg:flex-1 lg:items-center lg:bg-neutral-900">
        <motion.div initial="initial" animate="enter" variants={pageVariants} className="w-full max-w-sm">
          <div className="mb-6 text-center lg:text-left">
            <h1 className="text-xl font-bold text-white">
              Bienvenue sur <span className="text-teal-400">AuditRef</span>
            </h1>
            <p className="mt-1 text-sm text-neutral-400">
              Votre solution pour des audits terrain simples, rapides et efficaces.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 shadow-2xl sm:p-8">
            <h2 className="text-lg font-bold text-white">Connexion</h2>
            <p className="mt-1 text-sm text-neutral-400">Accédez à votre espace AuditRef</p>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit} noValidate>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" aria-hidden="true" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError("");
                    }}
                    className="block w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-neutral-500 transition-colors focus:border-teal-500/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                    placeholder="Mot de passe"
                    aria-invalid={!!error}
                    aria-describedby={error ? "password-error" : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 transition-colors hover:text-neutral-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p id="password-error" className="text-sm font-medium text-red-400" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={!password}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-teal-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-teal-500"
              >
                Se connecter
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-[10px] font-light uppercase tracking-wider text-neutral-500">
            AuditRef &copy; {new Date().getFullYear()} - Tous droits réservés |{" "}
            <a
              href="mailto:florent.perez@tisseo.fr?subject=Contact%20depuis%20AuditRef"
              className="font-normal normal-case text-teal-400 hover:underline"
            >
              Contact
            </a>{" "}
            | 72 76
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;

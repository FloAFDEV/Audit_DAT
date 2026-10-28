import React, { Suspense, lazy, useState } from "react";
import HomeHero from "./home/HomeHero";

/** Storytelling « comment se déroule un audit », sous le premier écran :
 *  chargé à part pour ne pas alourdir l'affichage du formulaire. */
const HomeAuditStory = lazy(() => import("./home/HomeAuditStory"));

interface LoginProps {
  onLoginSuccess: () => void;
}

const CORRECT_PASSWORD = "tisseoiv";

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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

  // Logique de connexion inchangée ; la page d'accueil n'en reçoit que l'état et les gestes.
  return (
    <div className="bg-white dark:bg-slate-950">
      <HomeHero
        login={{
          password,
          error,
          showPassword,
          onPasswordChange: (value) => {
            setPassword(value);
            if (error) setError("");
          },
          onToggleShowPassword: () => setShowPassword((v) => !v),
          onSubmit: handleSubmit,
        }}
      />
      <Suspense fallback={null}>
        <HomeAuditStory />
      </Suspense>
    </div>
  );
};

export default Login;

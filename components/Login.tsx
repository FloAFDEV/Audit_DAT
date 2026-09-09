
import React, { useState } from "react";
import { Logo } from "./Logo";

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

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900">
      <main className="flex-grow flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-8 space-y-8">
          <div className="text-center">
            <div className="mx-auto flex justify-center">
              <Logo className="h-12 w-12" />
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              AuditRef
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Portail d'Audit Tisséo</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
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
                className="block w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-600 transition-colors"
                placeholder="Mot de passe"
              />
            </div>

            {error && (
              <p className="text-sm font-medium text-red-600 dark:text-red-400" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-lg bg-teal-600 hover:bg-teal-700 py-2.5 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
            >
              Se connecter
            </button>
          </form>
        </div>
      </main>

      <footer className="text-center py-6 text-slate-500 dark:text-slate-400 text-[10px] font-light tracking-wider uppercase">
        <p>
          AuditRef &copy; {new Date().getFullYear()} - Tous droits réservés |{" "}
          <a
            href="mailto:florent.perez@tisseo.fr?subject=Contact%20depuis%20AuditRef"
            className="text-teal-600 dark:text-teal-400 hover:underline font-normal normal-case"
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

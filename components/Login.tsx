import React, { useState } from 'react';
import { Globe } from 'lucide-react';

interface LoginProps {
    onLoginSuccess: () => void;
}

const CORRECT_PASSWORD = "tisseoiv"; // Hardcoded password

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === CORRECT_PASSWORD) {
            setError('');
            onLoginSuccess();
        } else {
            setError('Mot de passe incorrect.');
            setPassword('');
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-slate-950">
            <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <div className="w-full max-w-md space-y-8">
                    <div>
                        <div className="flex justify-center items-center gap-3 mt-6">
                            <Globe className="h-8 w-8 text-teal-600" />
                            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-slate-100">
                                Portail d'Audit Tisséo
                            </h2>
                        </div>
                    </div>
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div className="rounded-md shadow-sm">
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
                                    className="relative block w-full appearance-none rounded-md bg-white px-3 py-2 text-gray-900 placeholder-gray-500 ring-1 ring-inset ring-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-teal-600 sm:text-sm dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600 dark:placeholder-slate-400 dark:focus:ring-teal-500"
                                    placeholder="Mot de passe"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
                                <div className="flex">
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-red-800 dark:text-red-300">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                className="group relative flex w-full justify-center rounded-md border border-transparent bg-teal-600 py-2 px-4 text-sm font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
                            >
                                Se connecter
                            </button>
                        </div>
                    </form>
                </div>
            </main>
            <footer className="text-center py-6 text-gray-500 dark:text-slate-400 text-xs">
                <p>
                    AuditRef © 2025 - Tous droits réservés |{" "}
                    <a
                        href="mailto:florent.perez@tisseo.fr?subject=Contact%20depuis%20l'application%20AuditRef"
                        className="text-blue-500 hover:underline"
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
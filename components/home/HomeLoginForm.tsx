// components/home/HomeLoginForm.tsx
// Champs de connexion de la page d'accueil — présentation seule : l'état et
// la vérification restent dans Login.tsx (onSubmit inchangé).
import React from 'react';
import { ArrowRight, Eye, EyeOff, Lock } from 'lucide-react';

export interface HomeLoginProps {
    password: string;
    error: string;
    showPassword: boolean;
    onPasswordChange: (value: string) => void;
    onToggleShowPassword: () => void;
    onSubmit: (e: React.FormEvent) => void;
}

interface HomeLoginFormProps {
    login: HomeLoginProps;
    /** `bar` : une ligne (bandeau) ; `panel` : empilé (carte). */
    layout?: 'bar' | 'panel';
    tone?: 'light' | 'dark';
    className?: string;
}

export const HomeLoginForm: React.FC<HomeLoginFormProps> = ({ login, layout = 'panel', tone = 'light', className = '' }) => {
    const dark = tone === 'dark';
    const field = dark
        ? 'border-white/15 bg-white/5 text-white placeholder:text-slate-400 focus:border-teal-400/60'
        : 'border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus:border-teal-600/60 dark:border-slate-600 dark:bg-slate-900 dark:text-white';
    const iconTone = dark ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400';

    return (
        <form onSubmit={login.onSubmit} noValidate className={className}>
            <div className={layout === 'bar' ? 'flex items-center gap-2' : 'space-y-3'}>
                <label htmlFor="password" className="sr-only">Mot de passe</label>
                <div className={`relative ${layout === 'bar' ? 'w-52' : ''}`}>
                    <Lock className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${iconTone}`} aria-hidden="true" />
                    <input
                        id="password"
                        name="password"
                        type={login.showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={login.password}
                        onChange={(e) => login.onPasswordChange(e.target.value)}
                        placeholder="Mot de passe"
                        aria-invalid={!!login.error}
                        aria-describedby={login.error ? 'password-error' : undefined}
                        className={`block w-full rounded-lg border py-2.5 pl-10 pr-10 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${field}`}
                    />
                    <button
                        type="button"
                        onClick={login.onToggleShowPassword}
                        className={`absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 ${iconTone}`}
                        aria-label={login.showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                        {login.showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                <button
                    type="submit"
                    disabled={!login.password}
                    className={`flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${dark ? 'focus-visible:ring-offset-slate-950' : 'focus-visible:ring-offset-white'} ${layout === 'panel' ? 'w-full' : ''}`}
                >
                    Se connecter
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
            </div>
            {login.error && (
                <p id="password-error" role="alert" className={`mt-2 text-sm font-medium ${dark ? 'text-red-300' : 'text-red-600 dark:text-red-400'}`}>
                    {login.error}
                </p>
            )}
        </form>
    );
};

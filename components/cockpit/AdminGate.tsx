// components/cockpit/AdminGate.tsx
// =================================================================
// Verrou Admin de la section cockpit — même principe que Login.tsx
// (code local comparé côté client, rien de plus) : ce n'est pas une
// sécurité applicative, seulement un garde-fou contre une modification
// accidentelle du référentiel/des stations sur le terrain.
// isAdminUnlocked n'est volontairement PAS persisté (store.ts) : il se
// réinitialise à chaque rechargement et à la déconnexion.
// =================================================================
import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import useAuditStore from '../../store';

export const ADMIN_CODE = '3194';

const AdminGate: React.FC = () => {
    const unlockAdmin = useAuditStore(s => s.unlockAdmin);
    const [code, setCode] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (code === ADMIN_CODE) {
            setError('');
            unlockAdmin();
        } else {
            setError('Code incorrect.');
            setCode('');
        }
    };

    return (
        <div className="flex items-center justify-center py-16">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-xs p-6 space-y-4 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-slate-200 dark:border-slate-700 text-center"
            >
                <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                    <Lock className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Accès Admin</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Code à 4 chiffres requis pour administrer le référentiel et les stations.</p>
                </div>
                <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    aria-label="Code Admin à 4 chiffres"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    className="block w-full text-center tracking-[0.5em] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 py-2 px-3 text-lg text-slate-900 dark:text-slate-50 focus:ring-2 focus:ring-inset focus:ring-teal-600"
                    placeholder="••••"
                />
                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                <button
                    type="submit"
                    className="w-full px-4 py-2 rounded-lg text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700"
                >
                    Déverrouiller
                </button>
            </form>
        </div>
    );
};

export default AdminGate;

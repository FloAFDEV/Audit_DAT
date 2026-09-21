// components/AboutModal.tsx
// Composant autonome et réutilisable — identité produit ("À propos").
// Aucune dépendance nouvelle, aucun modèle Dexie touché, style aligné
// sur ConfirmationModal (mêmes classes de backdrop/panneau).
import React from 'react';
import { X, Info } from 'lucide-react';
import { Logo } from './Logo';
import { APP_NAME, APP_TAGLINE, APP_PIPELINE, APP_AUTHOR, APP_VERSION, APP_RELEASE_DATE } from '../data/appInfo';

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="about-modal-title">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75 dark:bg-black/80 transition-opacity z-50 flex items-center justify-center p-4" onClick={onClose}>
                <div
                    className="relative transform overflow-hidden rounded-lg bg-white dark:bg-slate-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md dark:ring-1 dark:ring-teal-400/70"
                    onClick={e => e.stopPropagation()}
                >
                    <div className="px-5 pb-5 pt-5 sm:p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Logo className="w-9 h-9 text-teal-600 dark:text-teal-400 flex-shrink-0" />
                                <div>
                                    <h3 id="about-modal-title" className="text-lg font-bold text-gray-900 dark:text-slate-100">{APP_NAME}</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">v{APP_VERSION} · {APP_RELEASE_DATE}</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                                aria-label="Fermer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">{APP_TAGLINE}</p>

                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4">
                            {APP_PIPELINE.map((step, i) => (
                                <React.Fragment key={step}>
                                    <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 font-medium">{step}</span>
                                    {i < APP_PIPELINE.length - 1 && <span className="text-slate-300 dark:text-slate-600">→</span>}
                                </React.Fragment>
                            ))}
                        </div>

                        <div className="flex items-start gap-2 text-xs text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-700 pt-3">
                            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            <p>Conception et développement : <span className="font-semibold text-slate-600 dark:text-slate-300">{APP_AUTHOR}</span></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AboutModal;

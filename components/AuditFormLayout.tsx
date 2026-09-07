
import React, { useState } from 'react';
import { AuditModule } from '../types';
import { ArrowLeft, DatabaseBackup } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { LineIcon } from './LineIcon';
import { ModuleIcon } from './ModuleIcon';
import VoiceInput from './VoiceInput';

interface AuditFormLayoutProps {
    module: AuditModule;
    title: React.ReactNode;
    customIcon?: React.ReactNode;
    subtitle: React.ReactNode;
    progress: number;
    onBack: () => void;
    onReset: () => void;
    resetConfirmTitle: string;
    resetConfirmMessage: string;
    comment: string | undefined;
    onCommentChange: (comment: string) => void;
    children: React.ReactNode;
    footer?: React.ReactNode;
    commentIsReadOnly?: boolean;
}

const AuditFormLayout: React.FC<AuditFormLayoutProps> = ({
    module,
    title,
    customIcon,
    subtitle,
    progress,
    onBack,
    onReset,
    resetConfirmTitle,
    resetConfirmMessage,
    comment,
    onCommentChange,
    children,
    footer,
    commentIsReadOnly,
}) => {
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    const progressBarColor = 'bg-teal-500 dark:bg-teal-600';

    return (
        // overflow-clip (pas overflow-hidden) : rogne les coins arrondis exactement
        // pareil, mais SANS établir de conteneur défilant. `overflow-hidden` casse
        // silencieusement position: sticky de tout descendant (constaté en direct :
        // le header restait figé en haut de la carte au lieu de suivre le scroll de
        // la page) — `clip` clippe visuellement sans ce piège.
        <div className="bg-white dark:bg-slate-800 shadow-lg rounded-xl overflow-clip">
            {/* Contexte de l'audit — sticky : reste visible pendant le défilement
             *  des repères (station/direction/progression/réinitialisation sont
             *  consultés en continu pendant la saisie terrain). Compact sur
             *  mobile (une seule ligne, action de reset réduite à son icône)
             *  pour maximiser la hauteur utile ; identique à l'existant à partir
             *  de sm: (aucun changement visuel tablette/desktop hors le sticky).
             *  Le conteneur borne naturellement le sticky à la hauteur de la
             *  carte : il cesse de coller une fois la carte entièrement défilée,
             *  sans JS ni position: fixed. */}
            <div className="p-3 sm:p-6 sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                <div className="flex items-center sm:items-start justify-between gap-2 sm:gap-4">
                    <div className="flex items-center sm:items-start gap-2 sm:gap-4 flex-1 min-w-0">
                        <button
                            onClick={onBack}
                            className="p-1.5 sm:p-2 sm:mt-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors flex-shrink-0 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                            aria-label="Retour"
                        >
                            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                            {customIcon ?? <ModuleIcon type={module.type} className="w-6 h-6 sm:w-8 sm:h-8 text-gray-700 dark:text-slate-300 flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                                <h2 className="text-base sm:text-2xl font-medium tracking-tight text-slate-900 dark:text-slate-100 truncate sm:overflow-visible sm:whitespace-normal">{title}</h2>
                                <div className="flex items-center gap-2 sm:gap-3 mt-0.5 sm:mt-1 min-w-0">
                                    <LineIcon module={module} size="sm" />
                                    {subtitle}
                                </div>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowResetConfirm(true)}
                        className="flex-shrink-0 flex items-center gap-x-1.5 rounded-md p-2 sm:px-3 sm:py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors dark:text-red-400 dark:hover:bg-red-900/20"
                        title="Réinitialiser l'audit"
                        aria-label="Réinitialiser l'audit"
                    >
                        <DatabaseBackup className="h-4 w-4" />
                        <span className="hidden sm:inline">Réinitialiser</span>
                    </button>
                </div>
                <div className="mt-2 sm:mt-4 pl-0 sm:pl-[72px]"> {/* Aligned with title content */}
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs sm:text-sm font-normal text-slate-500 dark:text-slate-400">Progression</span>
                        <span className="text-xs sm:text-sm font-normal text-slate-700 dark:text-slate-300">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                        <div className={`${progressBarColor} h-2 rounded-full transition-all duration-75`} style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            </div>

            {children}

            <div className="p-6 border-t border-gray-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                <h3 className="text-lg font-medium tracking-tight text-slate-900 dark:text-slate-100 mb-2">Commentaires</h3>
                <p className="text-sm font-light text-slate-500 dark:text-slate-400 mb-4">Remarques ou des détails sur l'incident si nécessaire.</p>
                <VoiceInput
                    value={comment || ''}
                    onChange={onCommentChange}
                    placeholder="Ajouter un commentaire (ou utilisez le micro)..."
                    readOnly={commentIsReadOnly}
                />
            </div>

            {footer}

            <ConfirmationModal
                isOpen={showResetConfirm}
                onClose={() => setShowResetConfirm(false)}
                onConfirm={() => { onReset(); setShowResetConfirm(false); }}
                title={resetConfirmTitle}
                message={resetConfirmMessage}
                icon={<LineIcon module={module} size="sm" />}
                isDestructive
            />
        </div>
    );
};

export default AuditFormLayout;
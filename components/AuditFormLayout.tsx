import React, { useState } from 'react';
import { AuditModule } from '../types';
import { ArrowLeft, DatabaseBackup } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { LineIcon } from './LineIcon';

interface AuditFormLayoutProps {
    module: AuditModule;
    title: React.ReactNode;
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
}

const AuditFormLayout: React.FC<AuditFormLayoutProps> = ({
    module,
    title,
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
}) => {
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    const isComplete = Math.round(progress) === 100;
    const isInProgress = progress > 0 && !isComplete;
    const progressBarColor = isInProgress ? 'bg-amber-500' : 'bg-teal-500 dark:bg-teal-600';

    return (
        <div className="bg-white dark:bg-slate-800 shadow-lg rounded-xl overflow-hidden">
            <div className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                        <button
                            onClick={onBack}
                            className="p-2 mt-1 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors flex-shrink-0 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                            aria-label="Retour"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
                        <div className="flex-1 min-w-0">
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-slate-100">{title}</h2>
                            <div className="flex items-center gap-3 mt-2">
                                <LineIcon module={module} size="sm" />
                                {subtitle}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowResetConfirm(true)}
                        className="self-start sm:ml-4 flex-shrink-0 flex items-center gap-x-1.5 rounded-md px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors dark:text-red-400 dark:hover:bg-red-900/20"
                        title="Réinitialiser l'audit"
                        aria-label="Réinitialiser l'audit"
                    >
                        <DatabaseBackup className="h-4 w-4" />
                        <span>Réinitialiser</span>
                    </button>
                </div>
                <div className="mt-4 pl-0 sm:pl-16">
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-500 dark:text-slate-400">Progression</span>
                        <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                        <div className={`${progressBarColor} h-2 rounded-full transition-all duration-300`} style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            </div>
            
            {children}

            <div className="p-6 border-t border-gray-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-2">Commentaires</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">Remarques ou des détails sur l'incident si nécessaire.</p>
                <textarea
                    rows={4}
                    className="block w-full rounded-lg border-0 bg-white dark:bg-slate-900 px-3 py-2 text-base text-gray-900 dark:text-slate-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-600 placeholder:text-gray-500 dark:placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:focus:ring-indigo-500 leading-6"
                    placeholder="Ajouter un commentaire..."
                    value={comment || ''}
                    onChange={(e) => onCommentChange(e.target.value)}
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

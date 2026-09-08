
import React, { useEffect, useRef, useState } from 'react';
import { AuditModule } from '../types';
import { ArrowLeft, DatabaseBackup } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';
import { LineIcon } from './LineIcon';
import { ModuleIcon } from './ModuleIcon';
import VoiceInput from './VoiceInput';

// Distance de défilement (en px) à partir du haut de la carte avant de
// déclencher le mode compact — correspond à peu près à la hauteur du header
// complet plus un premier item de liste, pour ne réduire le header qu'une
// fois l'utilisateur réellement engagé dans le défilement (pas au premier
// pixel). Seuil simple, fixe, indépendant de la hauteur réelle du header.
const COMPACT_TRIGGER_MARGIN_PX = 140;

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
    // Mobile uniquement (cf. garde CSS sm:!grid-rows-[1fr] sur la variante
    // complète, qui neutralise cet état à partir de sm: quoi qu'il arrive) :
    // le header sticky existant se compacte une fois que l'utilisateur a
    // suffisamment défilé, sans changer son principe (toujours sticky,
    // jamais fixed) ni réorganiser le formulaire.
    const [isCompact, setIsCompact] = useState(false);
    const sentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        // threshold: 0 + rootMargin par défaut : la sentinelle déclenche dès
        // qu'elle quitte entièrement le haut du viewport. Sa position/hauteur
        // (fixée en style inline, cf. JSX) est totalement indépendante de la
        // hauteur réelle du header — point important : la sentinelle NE PEUT
        // PAS être placée après le header lui-même, sinon son déclenchement
        // déplacerait sa propre position (le header rétréci occupe moins de
        // place), ce qui la maintient artificiellement hors-champ même de
        // retour en haut de page (constaté en direct : le mode compact restait
        // bloqué après un scroll vers le haut). D'où le positionnement en
        // `absolute` sur le conteneur de la carte, avant le header sticky.
        const observer = new IntersectionObserver(
            ([entry]) => setIsCompact(!entry.isIntersecting),
            { threshold: 0 }
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, []);

    const progressBarColor = 'bg-teal-500 dark:bg-teal-600';

    return (
        // overflow-clip (pas overflow-hidden) : rogne les coins arrondis exactement
        // pareil, mais SANS établir de conteneur défilant. `overflow-hidden` casse
        // silencieusement position: sticky de tout descendant (constaté en direct :
        // le header restait figé en haut de la carte au lieu de suivre le scroll de
        // la page) — `clip` clippe visuellement sans ce piège.
        <div className="relative bg-white dark:bg-slate-800 shadow-lg rounded-xl overflow-clip">
            {/* Sentinelle de déclenchement du mode compact — absolument
             *  positionnée par rapport à la carte (relative ci-dessus),
             *  hauteur fixe indépendante du header : quand elle sort
             *  entièrement du haut du viewport, l'utilisateur a défilé d'une
             *  distance connue et constante, quel que soit l'état du header.
             *  Invisible, ne réorganise rien (hors du flux normal). */}
            <div
                ref={sentinelRef}
                aria-hidden="true"
                className="absolute top-0 left-0 w-px pointer-events-none"
                style={{ height: COMPACT_TRIGGER_MARGIN_PX }}
            />

            {/* Contexte de l'audit — sticky : reste visible pendant le défilement
             *  des repères (station/direction/progression/réinitialisation sont
             *  consultés en continu pendant la saisie terrain). Compact sur
             *  mobile (une seule ligne, action de reset réduite à son icône)
             *  pour maximiser la hauteur utile ; identique à l'existant à partir
             *  de sm: (aucun changement visuel tablette/desktop hors le sticky).
             *  Le conteneur borne naturellement le sticky à la hauteur de la
             *  carte : il cesse de coller une fois la carte entièrement défilée,
             *  sans JS ni position: fixed. */}
            <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                {/* Variante compacte — mobile uniquement, affichée une fois le
                 *  seuil de scroll franchi. Ne remplace pas la variante complète
                 *  dans le DOM : les deux existent, une seule a une hauteur non
                 *  nulle (transition CSS pure sur grid-template-rows, sans
                 *  mesure JS ni nouvelle dépendance). L'agent terrain garde
                 *  Retour, l'identité de l'audit (titre + repère existants,
                 *  non modifiés), Réinitialiser et la progression en %. */}
                <div
                    className="sm:hidden grid overflow-hidden transition-[grid-template-rows] duration-200 ease-in-out"
                    style={{ gridTemplateRows: isCompact ? '1fr' : '0fr' }}
                >
                    <div className="min-h-0 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2">
                            <button
                                onClick={onBack}
                                className="p-1.5 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors flex-shrink-0 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                                aria-label="Retour"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            {customIcon ?? <ModuleIcon type={module.type} className="w-5 h-5 text-gray-700 dark:text-slate-300 flex-shrink-0" />}
                            {/* Même titre/sous-titre que la variante complète, fusionnés
                             *  sur une ligne et tronqués — aucune donnée nouvelle, aucune
                             *  modification des formulaires : {subtitle} est toujours le
                             *  <p> fourni par chacun des 7 formulaires, simplement rendu
                             *  inline ([&>p]:inline) pour participer à la même ligne
                             *  tronquée que le titre. */}
                            <div className="flex-1 min-w-0 truncate text-sm text-slate-700 dark:text-slate-300 [&>p]:inline [&>p]:m-0 [&>p]:text-inherit [&>p]:text-sm">
                                <span className="font-medium text-slate-900 dark:text-slate-100">{title}</span>
                                <span className="text-slate-400 dark:text-slate-500 mx-1.5">&bull;</span>
                                {subtitle}
                            </div>
                            <span className="flex-shrink-0 text-xs font-normal text-slate-500 dark:text-slate-400">{Math.round(progress)}%</span>
                            <button
                                onClick={() => setShowResetConfirm(true)}
                                className="flex-shrink-0 p-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors dark:text-red-400 dark:hover:bg-red-900/20"
                                title="Réinitialiser l'audit"
                                aria-label="Réinitialiser l'audit"
                            >
                                <DatabaseBackup className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Variante complète — comportement et rendu strictement
                 *  identiques à l'existant. sm:!grid-rows-[1fr] force cette
                 *  variante à occuper toute sa hauteur à partir de sm:, quel
                 *  que soit isCompact : le desktop n'est jamais affecté. */}
                <div
                    className="grid overflow-hidden transition-[grid-template-rows] duration-200 ease-in-out sm:!grid-rows-[1fr]"
                    style={{ gridTemplateRows: isCompact ? '0fr' : '1fr' }}
                >
                    <div className="min-h-0 overflow-hidden">
                        <div className="p-3 sm:p-6">
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
                                            {/* [&>p]:... : corrige le retour à la ligne du sous-titre sur
                                             *  mobile (le <p> fourni par chaque formulaire n'a pas de
                                             *  truncate propre) sans toucher aux 7 formulaires ni à leurs
                                             *  données — neutralisé à partir de sm: pour ne rien changer
                                             *  au rendu desktop existant (retour à whitespace-normal). */}
                                            <div className="flex items-center gap-2 sm:gap-3 mt-0.5 sm:mt-1 min-w-0 [&>p]:min-w-0 [&>p]:truncate sm:[&>p]:overflow-visible sm:[&>p]:whitespace-normal">
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
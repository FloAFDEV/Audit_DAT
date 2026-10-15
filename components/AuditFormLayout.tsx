
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
    /** Lieu audité (station, P+R) — information principale du header. */
    station: React.ReactNode;
    /** Précision affichée après le nom de l'audit (direction, équipement…). */
    context?: React.ReactNode;
    /** Visuel de l'objet audité (≈32 px), à côté du nom de l'audit — icône du module par défaut. */
    customIcon?: React.ReactNode;
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
    station,
    context,
    customIcon,
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

    const topSentinelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        const topSentinel = topSentinelRef.current;
        if (!sentinel || !topSentinel) return;
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
        //
        // Hystérésis : on compacte quand la sentinelle de seuil sort par le
        // haut, mais on ne revient à la variante complète que lorsque le haut
        // de la carte redevient visible (sentinelle de tête). Sans cet écart,
        // en bas de page, le compactage raccourcit le document, le navigateur
        // remonte le scroll d'autant, la sentinelle de seuil réapparaît, le
        // header se réagrandit… et boucle (constaté en direct sur mobile :
        // header qui « sautille » en bas des formulaires courts).
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.target === sentinel) {
                        if (!entry.isIntersecting && entry.boundingClientRect.top < 0) setIsCompact(true);
                    } else if (entry.isIntersecting) {
                        setIsCompact(false);
                    }
                }
            },
            { threshold: 0 }
        );
        observer.observe(sentinel);
        observer.observe(topSentinel);
        return () => observer.disconnect();
    }, []);

    const progressBarColor = 'bg-teal-500 dark:bg-teal-600';
    const visual = customIcon ?? <ModuleIcon type={module.type} className="w-7 h-7 text-gray-700 dark:text-slate-300 flex-shrink-0" />;

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
            {/* Sentinelle de tête — retour à la variante complète uniquement
             *  quand le haut de la carte redevient visible (hystérésis). */}
            <div
                ref={topSentinelRef}
                aria-hidden="true"
                className="absolute top-0 left-0 w-px h-px pointer-events-none"
            />

            {/* Contexte de l'audit — sticky : reste visible pendant le défilement
             *  des repères. Hiérarchie terrain : STATION (information
             *  principale) > badge ligne + visuel de l'objet audité (repères
             *  visuels) > nom de l'audit (secondaire) > progression.
             *  Sur mobile, le header se compacte une fois le seuil de scroll
             *  franchi (une seule bande : ligne, visuel, station, audit, %).
             *  Le conteneur borne naturellement le sticky à la hauteur de la
             *  carte : il cesse de coller une fois la carte entièrement défilée,
             *  sans JS ni position: fixed. */}
            <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
                {/* Variante compacte — mobile uniquement. Les deux variantes
                 *  existent dans le DOM, une seule a une hauteur non nulle
                 *  (transition CSS pure sur grid-template-rows). */}
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
                            <LineIcon module={module} size="md" />
                            {visual}
                            <div className="flex-1 min-w-0 leading-tight">
                                <p className="text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-2">{station}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{title}</p>
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
                        <div className="h-1 bg-gray-200 dark:bg-slate-700">
                            <div className={`${progressBarColor} h-1 transition-all duration-75`} style={{ width: `${progress}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* Variante complète — toujours affichée à partir de sm:
                 *  (sm:!grid-rows-[1fr]), quel que soit isCompact. */}
                <div
                    className="grid overflow-hidden transition-[grid-template-rows] duration-200 ease-in-out sm:!grid-rows-[1fr]"
                    style={{ gridTemplateRows: isCompact ? '0fr' : '1fr' }}
                >
                    <div className="min-h-0 overflow-hidden">
                        <div className="p-3 sm:p-5 lg:p-6">
                            <div className="flex items-start gap-3 sm:gap-4">
                                <button
                                    onClick={onBack}
                                    className="p-1.5 sm:p-2 -ml-1 mt-0.5 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors flex-shrink-0 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                                    aria-label="Retour"
                                >
                                    <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                                </button>
                                <div className="mt-0.5 flex-shrink-0"><LineIcon module={module} size="lg" /></div>
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight leading-tight text-slate-900 dark:text-slate-100 break-words">{station}</h2>
                                    <div className="flex items-center gap-2 mt-1.5 sm:mt-2 min-w-0">
                                        {visual}
                                        <p className="min-w-0 text-sm sm:text-base font-medium leading-snug text-slate-600 dark:text-slate-300">
                                            {title}
                                            {context && <span className="font-normal text-slate-500 dark:text-slate-400"> &bull; {context}</span>}
                                        </p>
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
                            <div className="mt-3 sm:mt-4 sm:pl-[52px]">
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
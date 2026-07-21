// components/cockpit/ReferenceQualificationView.tsx
// =================================================================
// Sous-vue « Qualification référentiel » de la section Patrimoine
// (ex-section racine « Arbitrages » — déplacement + renommage).
// -----------------------------------------------------------------
// Portée strictement limitée au CATALOGUE : « cette fiche référence
// est-elle correcte/complète ? » — jamais un constat terrain (ça, c'est
// le rôle de la section Anomalies, traité automatiquement, sans
// décision humaine). C'est pourquoi ce n'est plus une section racine
// du cockpit : c'est un sous-onglet de Patrimoine, au même titre que
// Références et Implantations — une question de qualité de donnée, pas
// une étape du flux opérationnel.
//
// Écrit dans signageReferences via useArbitrage (seule mutation de ce
// module) : sous-objet unique `arbitrage` (R1 : "remove" n'efface
// jamais la référence, seulement la décision).
// =================================================================
import React, { useMemo, useState } from 'react';
import { Scale, Check, ChevronRight, History } from 'lucide-react';
import { ArbitrageStatus, SignageReference } from '../../types';
import { useArbitrage } from '../../hooks/useArbitrage';
import { ARBITRAGE_LABELS as DECISION_LABELS } from './labels';

const DECISION_STYLE: Record<ArbitrageStatus, string> = {
    keep: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
    remove: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    to_document: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
};

const DECISION_ORDER: ArbitrageStatus[] = ['keep', 'remove', 'to_document'];

/** Motif de la divergence — dérivé des documents externes seedés (R8),
 *  sans nouveau champ : la donnée existe déjà, on la rend simplement lisible. */
const reviewReasonOf = (ref: SignageReference): string => {
    const noted = ref.externalDocuments?.find(d => d.note)?.note;
    if (noted) return noted;
    if (ref.legacyDescription) return 'Qualification à compléter (description historique disponible ci-dessous).';
    return 'Référence signalée pour qualification.';
};

const QualificationCard: React.FC<{
    reference: SignageReference;
    onOpenReference: (id: string) => void;
    onDecide: (status: ArbitrageStatus, reason: string) => void;
}> = ({ reference, onOpenReference, onDecide }) => {
    const [reason, setReason] = useState(reference.arbitrage?.reason ?? '');
    const [pendingStatus, setPendingStatus] = useState<ArbitrageStatus | null>(null);

    const currentStatus = reference.arbitrage?.status;
    const history = reference.arbitrage?.history ?? [];

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 truncate">{reference.name}</h4>
                    <p className="font-mono text-xs text-slate-400 dark:text-slate-500">
                        {reference.code ? `${reference.code} · ` : ''}{reference.id}
                    </p>
                </div>
                {currentStatus && (
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${DECISION_STYLE[currentStatus]}`}>
                        {DECISION_LABELS[currentStatus]}
                    </span>
                )}
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">{reviewReasonOf(reference)}</p>

            {reference.legacyDescription && (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic mb-3">
                    Description historique : {reference.legacyDescription}
                </p>
            )}

            {history.length > 0 && (
                <details className="mb-3">
                    <summary className="flex items-center gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400 cursor-pointer hover:underline">
                        <History className="w-3.5 h-3.5" /> Historique ({history.length})
                    </summary>
                    <ul className="mt-2 space-y-1 pl-5">
                        {history.map((h, i) => (
                            <li key={i} className="text-xs text-slate-500 dark:text-slate-400">
                                <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold mr-1.5 ${DECISION_STYLE[h.status]}`}>
                                    {DECISION_LABELS[h.status]}
                                </span>
                                {h.reason && <span>— {h.reason}</span>}
                                <span className="text-slate-400"> · {new Date(h.date).toLocaleDateString('fr-FR')}</span>
                            </li>
                        ))}
                    </ul>
                </details>
            )}

            {/* Décision de qualification (catalogue uniquement) */}
            <div className="border-t border-slate-100 dark:border-slate-700 pt-3 space-y-2">
                <div className="flex flex-wrap gap-2">
                    {DECISION_ORDER.map(status => (
                        <button
                            key={status}
                            onClick={() => setPendingStatus(status)}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                                pendingStatus === status || (!pendingStatus && currentStatus === status)
                                    ? `${DECISION_STYLE[status]} border-transparent`
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                            }`}
                        >
                            {DECISION_LABELS[status]}
                        </button>
                    ))}
                </div>
                {pendingStatus && (
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="text"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Motif (ex. ancienne génération mais encore compatible)"
                            className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-600"
                        />
                        <button
                            onClick={() => { onDecide(pendingStatus, reason); setPendingStatus(null); }}
                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors whitespace-nowrap"
                        >
                            <Check className="w-4 h-4" /> Valider
                        </button>
                    </div>
                )}
            </div>

            <button
                onClick={() => onOpenReference(reference.id)}
                className="flex items-center gap-1 mt-3 text-sm font-semibold text-teal-700 dark:text-teal-300 hover:underline"
            >
                Voir la fiche complète <ChevronRight className="w-3.5 h-3.5" />
            </button>
        </div>
    );
};

interface ReferenceQualificationViewProps {
    references: SignageReference[];
    onReload: () => void;
    onOpenReference: (id: string) => void;
}

const ReferenceQualificationView: React.FC<ReferenceQualificationViewProps> = ({ references, onReload, onOpenReference }) => {
    const { decide } = useArbitrage();

    const pending = useMemo(() => references.filter(r => r.needsReview), [references]);
    const decided = useMemo(() => references.filter(r => !r.needsReview && r.arbitrage), [references]);

    const handleDecide = async (reference: SignageReference, status: ArbitrageStatus, reason: string) => {
        await decide(reference, status, reason || undefined);
        onReload();
    };

    if (pending.length === 0 && decided.length === 0) {
        return (
            <div className="py-16 text-center text-slate-500 dark:text-slate-400">
                <Scale className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">Aucune qualification en attente.</p>
                <p className="text-sm mt-1">Le référentiel ne signale aucune divergence à trancher.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <section>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-3">
                    À qualifier ({pending.length})
                </h3>
                {pending.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">Aucune référence en attente.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pending.map(ref => (
                            <QualificationCard
                                key={ref.id}
                                reference={ref}
                                onOpenReference={onOpenReference}
                                onDecide={(status, reason) => handleDecide(ref, status, reason)}
                            />
                        ))}
                    </div>
                )}
            </section>

            {decided.length > 0 && (
                <section>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-3">
                        Décisions enregistrées ({decided.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {decided.map(ref => (
                            <QualificationCard
                                key={ref.id}
                                reference={ref}
                                onOpenReference={onOpenReference}
                                onDecide={(status, reason) => handleDecide(ref, status, reason)}
                            />
                        ))}
                    </div>
                </section>
            )}
        </div>
    );
};

export default ReferenceQualificationView;

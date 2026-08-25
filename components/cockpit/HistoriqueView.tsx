// components/cockpit/HistoriqueView.tsx
// Section « Historique » du cockpit — archives des audits + journal d'événements.
// Contenu déplacé depuis StatsPage (onglet history), fonctionnellement identique.
import React, { useState, useEffect } from 'react';
import {
    Archive, History, Trash2, ScrollText, RotateCcw, Upload, Download,
    PlusCircle, MinusCircle, Scale, Database, AlertTriangle, LucideIcon,
} from 'lucide-react';
import { Lieu, AuditModule, HistoryEntry, MaintenanceItem, AppEvent, AppEventType } from '../../types';
import { db } from '../../db';
import { StatCard } from './primitives';
import ConfirmationModal from '../ConfirmationModal';
import MaintenanceListModal from '../MaintenanceListModal';
import { generateMaintenanceSummary } from '../../utils/maintenanceGenerator';
import { HistoryChart } from '../HistoryChart';
import toast from 'react-hot-toast';

interface HistoryListProps {
    onViewSnapshot: (entry: HistoryEntry) => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ onViewSnapshot }) => {
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [entryToDelete, setEntryToDelete] = useState<HistoryEntry | null>(null);

    const loadHistory = () => {
        db.history.orderBy('date').reverse().toArray().then(setHistory);
    };

    useEffect(() => {
        loadHistory();
    }, []);

    const handleDelete = async () => {
        if (entryToDelete && entryToDelete.id) {
            try {
                await db.history.delete(entryToDelete.id);
                loadHistory();
            } catch (error) {
                console.error("Échec de la suppression de l'archive :", error);
                toast.error("Échec de la suppression — réessayez.");
            } finally {
                setEntryToDelete(null);
            }
        }
    };

    const getDateParts = (dateStr: string) => {
        const date = new Date(dateStr);
        const day = date.toLocaleDateString('fr-FR', { day: '2-digit' });
        const month = date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
        const year = date.getFullYear();
        const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        return { day, month, year, time };
    };

    const getSubtitle = (type: string) => {
        switch(type) {
            case 'GLOBAL': return 'Réinitialisation complète du réseau';
            case 'CATEGORY': return 'Réinitialisation par ligne / catégorie';
            case 'MODULE_TYPE': return 'Réinitialisation par type d\'équipement';
            case 'SINGLE_AUDIT': return 'Réinitialisation d\'audit unique';
            default: return 'Instantané';
        }
    };

    if (!history || history.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                <Archive className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucune archive disponible.</p>
                <p className="text-sm mt-1">Les archives se créent automatiquement lors de la réinitialisation d'un audit.</p>
            </div>
        );
    }

    return (
        <>
            <HistoryChart data={history} />

            <div className="space-y-4">
                {history.map((entry) => {
                    const { day, month, year, time } = getDateParts(entry.date);
                    return (
                        <div key={entry.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-0 flex hover:shadow-md transition-shadow overflow-hidden group">
                            {/* Gauche : Date */}
                            <div className="flex flex-col items-center justify-center min-w-[90px] bg-slate-50 dark:bg-slate-700/50 border-r border-slate-200 dark:border-slate-700 py-4">
                                <span className="text-2xl font-bold text-gray-700 dark:text-slate-200 leading-none">{day}</span>
                                <span className="text-xs font-bold uppercase text-gray-500 dark:text-slate-400 mt-1">{month}</span>
                                <span className="text-xs text-gray-400 dark:text-slate-500 mt-2">{year}</span>
                                <span className="text-xs text-gray-400 dark:text-slate-500">{time}</span>
                            </div>

                            {/* Centre : Contenu (Cliquable) */}
                            <button
                                onClick={() => onViewSnapshot(entry)}
                                className="flex-1 flex items-center p-4 text-left outline-none focus:bg-slate-50 dark:focus:bg-slate-700/50"
                            >
                                <div className="flex-1 min-w-0 pr-4">
                                    <h4 className="font-bold text-lg text-gray-900 dark:text-slate-100 truncate mb-1 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                                        {entry.title}
                                    </h4>
                                    <p className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-2">
                                        <History className="w-3 h-3" />
                                        {getSubtitle(entry.type)}
                                    </p>
                                </div>

                                {/* Droite : Score */}
                                <div className="flex-shrink-0">
                                    <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold ${
                                        entry.score >= 90 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                                        entry.score >= 50 ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                                        entry.score > 0 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                        'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400' // Style neutre pour 0%
                                    }`}>
                                        {entry.score > 0 ? `${entry.score}%` : '-'}
                                    </span>
                                </div>
                            </button>

                            {/* Action : Supprimer */}
                            <div className="flex items-center pr-4 pl-2 border-l border-slate-100 dark:border-slate-700">
                                <button
                                    onClick={() => setEntryToDelete(entry)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                                    title="Supprimer cette entrée"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <ConfirmationModal
                isOpen={!!entryToDelete}
                onClose={() => setEntryToDelete(null)}
                onConfirm={handleDelete}
                title="Supprimer l'archive"
                message="Êtes-vous sûr de vouloir supprimer cette entrée d'archive ? Cette action est irréversible."
                isDestructive
            />
        </>
    );
};

// =================================================================
// JOURNAL D'ÉVÉNEMENTS (Lot 3) — trace chronologique et lisible des
// opérations métier importantes (import/export, réinitialisations,
// ajout/suppression d'éléments d'audit, arbitrage du référentiel,
// migrations, échecs critiques de persistance). Volontairement distinct
// des Archives ci-dessus (des instantanés complets, pas un journal) —
// cf. types.ts::AppEvent pour la distinction. Lecture seule : consulter,
// filtrer par catégorie — aucune suppression individuelle inventée, la
// rétention n'a pas été demandée à ce stade.
// =================================================================
const EVENT_TYPE_GROUPS: { key: string; label: string; types: AppEventType[] }[] = [
    { key: 'ALL', label: 'Tout', types: [] },
    { key: 'RESET', label: 'Réinitialisations', types: ['RESET_GLOBAL', 'RESET_CATEGORY', 'RESET_MODULE_TYPE', 'RESET_AUDIT'] },
    { key: 'IO', label: 'Import / Export', types: ['IMPORT', 'EXPORT'] },
    { key: 'AUDIT', label: "Éléments d'audit", types: ['AUDIT_ITEM_ADDED', 'AUDIT_ITEM_REMOVED'] },
    { key: 'REF', label: 'Référentiel', types: ['REFERENCE_ARBITRAGE'] },
    { key: 'SYSTEM', label: 'Système', types: ['DATA_MIGRATION', 'PERSISTENCE_ERROR'] },
];

const EVENT_ICON: Record<AppEventType, LucideIcon> = {
    RESET_GLOBAL: RotateCcw, RESET_CATEGORY: RotateCcw, RESET_MODULE_TYPE: RotateCcw, RESET_AUDIT: RotateCcw,
    IMPORT: Upload, EXPORT: Download,
    AUDIT_ITEM_ADDED: PlusCircle, AUDIT_ITEM_REMOVED: MinusCircle,
    REFERENCE_ARBITRAGE: Scale,
    DATA_MIGRATION: Database,
    PERSISTENCE_ERROR: AlertTriangle,
};

const formatEventDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} · ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
};

const EventJournal: React.FC = () => {
    const [events, setEvents] = useState<AppEvent[]>([]);
    const [filter, setFilter] = useState<string>('ALL');

    useEffect(() => {
        db.events.orderBy('date').reverse().toArray().then(setEvents).catch(err => {
            console.error("Échec de lecture du journal d'événements :", err);
            setEvents([]);
        });
    }, []);

    if (events.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                <ScrollText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucun événement enregistré.</p>
                <p className="text-sm mt-1">Le journal se remplit automatiquement lors des opérations importantes (import, export, réinitialisation, ajout/suppression d'éléments d'audit, arbitrage du référentiel...).</p>
            </div>
        );
    }

    const activeGroup = EVENT_TYPE_GROUPS.find(g => g.key === filter);
    const filtered = !activeGroup || activeGroup.key === 'ALL' ? events : events.filter(e => activeGroup.types.includes(e.type));

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                {EVENT_TYPE_GROUPS.map(g => (
                    <button
                        key={g.key}
                        onClick={() => setFilter(g.key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                            filter === g.key
                                ? 'bg-teal-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                        }`}
                    >
                        {g.label}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <p className="text-center py-8 text-sm text-slate-400 dark:text-slate-500">Aucun événement dans cette catégorie.</p>
            ) : (
                <ul className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                    {filtered.map(event => {
                        const Icon = EVENT_ICON[event.type] ?? ScrollText;
                        const isError = event.type === 'PERSISTENCE_ERROR';
                        return (
                            <li key={event.id} className="flex items-start gap-3 p-3">
                                <div className={`flex-shrink-0 mt-0.5 h-7 w-7 rounded-full flex items-center justify-center ${
                                    isError
                                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                                        : 'bg-teal-50 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400'
                                }`}>
                                    <Icon className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm text-slate-800 dark:text-slate-100 leading-snug">{event.summary}</p>
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{formatEventDate(event.date)}</p>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

const HistoriqueView: React.FC = () => {
    const [modalContent, setModalContent] = useState<{ title: string; items: MaintenanceItem[] } | null>(null);

    const handleViewSnapshot = (entry: HistoryEntry) => {
        try {
            const data = JSON.parse(entry.details);
            // Normalisation des données pour le générateur
            let lieuxToAnalyze: Lieu[] = [];

            if (Array.isArray(data)) {
                // Cas GLOBAL ou CATEGORY : c'est déjà une liste de Lieux
                lieuxToAnalyze = data as Lieu[];
            } else if (data && typeof data === 'object' && 'type' in data) {
                // Cas SINGLE_AUDIT : c'est un Module seul.
                // On doit le wrapper dans une structure Lieu pour que le générateur fonctionne
                const module = data as AuditModule;
                lieuxToAnalyze = [{
                    id: 'snapshot-wrapper',
                    name: 'Archive',
                    modules: [module]
                }];
            }

            // Volontairement non migré vers patrimoineIndex : ce moteur lit un
            // snapshot archivé, pas l'état courant. Recalculer via le catalogue
            // signageReferences ACTUEL réinterpréterait l'historique à travers
            // des références renommées/désactivées/modifiées depuis l'archive.
            const summary = generateMaintenanceSummary(lieuxToAnalyze);
            setModalContent({
                title: `Détails de l'archive : ${entry.title}`,
                items: summary.allDefects.items
            });

        } catch (e) {
            console.error("Failed to parse history entry details", e);
        }
    };

    return (
        <>
            <StatCard title="Archives des Audits" icon={<Archive className="w-6 h-6" />}>
                <HistoryList onViewSnapshot={handleViewSnapshot} />
            </StatCard>
            <StatCard title="Journal d'événements" icon={<ScrollText className="w-6 h-6" />}>
                <EventJournal />
            </StatCard>
            <MaintenanceListModal
                isOpen={!!modalContent}
                onClose={() => setModalContent(null)}
                title={modalContent?.title || ''}
                items={modalContent?.items || []}
            />
        </>
    );
};

export default HistoriqueView;

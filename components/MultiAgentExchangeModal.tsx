// components/MultiAgentExchangeModal.tsx
// Relevés multi-agents : export des observations de cet appareil et
// consolidation de N exports (utils/exchange/, docs/MULTI_AGENT.md).
// N'écrase jamais rien : l'historique est conservé, l'état courant de chaque
// contrôle suit son observation la plus récente.
import React, { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, Download, FileJson, Upload, Users, X } from 'lucide-react';
import useAuditStore from '../store';
import { downloadFile, slugify } from '../utils/csvExporter';
import { getLocalAgent } from '../utils/exchange/observationLog';
import type { ConsolidationPlan } from '../utils/exchange/consolidate';
import type { ConsolidationOutcome } from '../utils/exchange/observationLog';

interface MultiAgentExchangeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type SelectedFile = { name: string; content: string };

const formatDate = (iso?: string) => iso
    ? new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

const Stat: React.FC<{ label: string; value: number }> = ({ label, value }) => (
    <div className="rounded-md bg-slate-50 dark:bg-slate-900/50 px-3 py-2 ring-1 ring-slate-900/5 dark:ring-white/10">
        <p className="text-lg font-semibold text-gray-800 dark:text-slate-100">{value}</p>
        <p className="text-xs text-gray-500 dark:text-slate-400">{label}</p>
    </div>
);

const MultiAgentExchangeModal: React.FC<MultiAgentExchangeModalProps> = ({ isOpen, onClose }) => {
    const handleBuildExchangeExport = useAuditStore(s => s.handleBuildExchangeExport);
    const handlePreviewExchange = useAuditStore(s => s.handlePreviewExchange);
    const handleConsolidateExchange = useAuditStore(s => s.handleConsolidateExchange);

    const [agentName, setAgentName] = useState('');
    const [files, setFiles] = useState<SelectedFile[]>([]);
    const [preview, setPreview] = useState<ConsolidationPlan | null>(null);
    const [outcome, setOutcome] = useState<ConsolidationOutcome | null>(null);
    const [busy, setBusy] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        setAgentName(getLocalAgent().name);
        setFiles([]);
        setPreview(null);
        setOutcome(null);
    }, [isOpen]);

    if (!isOpen) return null;

    const handleExport = async () => {
        const name = agentName.trim();
        if (!name) { toast.error("Indiquez le nom de l'agent avant l'export."); return; }
        setBusy(true);
        try {
            const file = await handleBuildExchangeExport(name);
            downloadFile(JSON.stringify(file, null, 2), `releves-${slugify(name)}-${file.exportedAt.slice(0, 16).replace(/[T:]/g, '-')}.json`, 'application/json');
            toast.success(`${file.observations.length} observation(s) exportée(s).`);
        } catch (error) {
            console.error("Échec de l'export des relevés :", error);
            toast.error("Échec de l'export des relevés.");
        } finally {
            setBusy(false);
        }
    };

    const handleFilesSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const list = Array.from(event.target.files ?? []);
        event.target.value = '';
        if (list.length === 0) return;
        setBusy(true);
        try {
            const read = await Promise.all(list.map(async f => ({ name: f.name, content: await f.text() })));
            setFiles(read);
            setOutcome(null);
            setPreview(await handlePreviewExchange(read));
        } catch (error) {
            console.error('Lecture des fichiers impossible :', error);
            toast.error('Lecture des fichiers impossible.');
        } finally {
            setBusy(false);
        }
    };

    const handleConsolidate = async () => {
        setBusy(true);
        try {
            const result = await handleConsolidateExchange(files);
            setOutcome(result);
            setPreview(null);
            toast.success('Consolidation terminée.');
        } catch (error) {
            console.error('Échec de la consolidation :', error);
            toast.error('Échec de la consolidation — aucune donnée modifiée.');
        } finally {
            setBusy(false);
        }
    };

    const validFiles = preview?.previews.filter(p => p.ok).length ?? 0;
    const problems = outcome ? [...outcome.plan.problems, ...outcome.apply.problems] : preview?.problems ?? [];

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 dark:bg-black/80 transition-opacity z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="multi-agent-title" onClick={onClose}>
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-800 text-left shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-start gap-4 px-4 pt-5 sm:px-6">
                    <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/30">
                        <Users className="h-6 w-6 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div className="flex-1">
                        <h3 id="multi-agent-title" className="text-lg font-semibold text-gray-800 dark:text-slate-100">Relevés multi-agents</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Chaque agent exporte ses relevés ; l'appareil de consolidation les importe tous. Le constat le plus récent devient l'état courant, l'historique est conservé.</p>
                    </div>
                    <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200" aria-label="Fermer"><X className="h-5 w-5" /></button>
                </div>

                <section className="px-4 py-4 sm:px-6 border-b border-gray-200 dark:border-slate-700">
                    <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider">Exporter mes relevés</p>
                    <div className="mt-2 flex flex-col sm:flex-row gap-2">
                        <input
                            type="text" value={agentName} onChange={e => setAgentName(e.target.value)} placeholder="Nom de l'agent"
                            aria-label="Nom de l'agent"
                            className="flex-1 rounded-md border-0 py-2 px-3 text-sm text-gray-900 dark:text-slate-100 dark:bg-slate-700 ring-1 ring-inset ring-gray-300 dark:ring-slate-600 focus:ring-2 focus:ring-inset focus:ring-teal-600"
                        />
                        <button onClick={handleExport} disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:opacity-50">
                            <Download className="h-4 w-4" /> Exporter (.json)
                        </button>
                    </div>
                </section>

                <section className="px-4 py-4 sm:px-6">
                    <p className="text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider">Consolider des relevés</p>
                    <input ref={fileInputRef} type="file" accept=".json,application/json" multiple className="hidden" onChange={handleFilesSelected} />
                    <button onClick={() => fileInputRef.current?.click()} disabled={busy} className="mt-2 inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-teal-700 dark:text-teal-400 ring-1 ring-inset ring-teal-600 dark:ring-teal-400 hover:bg-teal-700 hover:text-white dark:hover:bg-teal-700 dark:hover:text-white disabled:opacity-50">
                        <Upload className="h-4 w-4" /> Sélectionner des fichiers…
                    </button>

                    {preview && (
                        <ul className="mt-3 divide-y divide-gray-100 dark:divide-slate-700 rounded-md ring-1 ring-gray-200 dark:ring-slate-700">
                            {preview.previews.map((p, i) => (
                                <li key={`${p.name}-${i}`} className="flex items-start gap-3 px-3 py-2 text-sm">
                                    <FileJson className={`mt-0.5 h-4 w-4 flex-shrink-0 ${p.ok ? 'text-teal-600 dark:text-teal-400' : 'text-red-500'}`} />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium text-gray-800 dark:text-slate-100">{p.name}</p>
                                        {p.ok
                                            ? <p className="text-xs text-gray-500 dark:text-slate-400">{p.agents.join(', ') || '—'} · {p.observationCount} observation(s) · exporté le {formatDate(p.exportedAt)} · référentiel {p.referentielVersion}</p>
                                            : <p className="text-xs text-red-600 dark:text-red-400">{p.error}</p>}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    {preview && (
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <Stat label="Nouvelles observations" value={preview.added.length} />
                            <Stat label="Déjà connues" value={preview.alreadyKnown} />
                        </div>
                    )}

                    {outcome && (
                        <div className="mt-3">
                            <p className="flex items-center gap-2 text-sm font-medium text-gray-800 dark:text-slate-100"><CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400" /> Résultat de la consolidation</p>
                            <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <Stat label="Nouvelles observations" value={outcome.plan.added.length} />
                                <Stat label="Déjà connues" value={outcome.plan.alreadyKnown} />
                                <Stat label="États mis à jour" value={outcome.apply.updated + outcome.apply.created} />
                                <Stat label="État local conservé" value={outcome.apply.unchanged} />
                            </div>
                        </div>
                    )}

                    {problems.length > 0 && (
                        <div className="mt-3 rounded-md bg-amber-50 dark:bg-amber-900/20 p-3">
                            <p className="flex items-center gap-2 text-sm font-medium text-amber-800 dark:text-amber-300"><AlertTriangle className="h-4 w-4" /> {problems.length} point(s) d'attention</p>
                            <ul className="mt-1 max-h-40 overflow-y-auto list-disc pl-5 text-xs text-amber-800 dark:text-amber-200 space-y-0.5">
                                {problems.map((p, i) => <li key={i}>{p.file ? `${p.file} — ` : ''}{p.message}</li>)}
                            </ul>
                        </div>
                    )}
                </section>

                <div className="bg-gray-50 dark:bg-slate-800/50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-2">
                    {preview && !outcome && (
                        <button onClick={handleConsolidate} disabled={busy || validFiles === 0} className="inline-flex w-full justify-center rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:opacity-50 sm:w-auto">
                            Consolider {validFiles} fichier(s)
                        </button>
                    )}
                    <button onClick={onClose} className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-slate-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-slate-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 sm:mt-0 sm:w-auto">
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MultiAgentExchangeModal;

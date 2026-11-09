import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Camera, Download, X } from 'lucide-react';
import { db } from '../db';
import useAuditStore from '../store';
import {
    BuiltPart, DEFAULT_PART_BYTES, PhotoExportError, PhotoExportScope, PhotoMeta,
    buildPhotoZipPart, formatBytes, planPhotoExport, scanPhotoMetadata,
} from '../utils/photos/photoExport';
import { deliverFile, deliveryMessage } from '../utils/photos/deliverFile';

// Export ZIP des photos ORIGINALES (lecture seule de la table `photos`) :
// périmètre station / ligne / tout, estimation avant export, une partie à la
// fois (mémoire des iPhone), progression, annulation, remise explicite par
// l'utilisateur (feuille de partage ou téléchargement). Aucune photo n'est
// modifiée ni supprimée.

type ScopeKind = PhotoExportScope['kind'];

type Phase =
    | { kind: 'idle' }
    | { kind: 'building'; part: number; done: number; total: number }
    | { kind: 'ready'; part: number; built: BuiltPart }
    | { kind: 'delivering'; part: number; built: BuiltPart }
    | { kind: 'finished' }
    | { kind: 'error'; message: string };

interface Report { delivered: number; messages: string[]; integrityIssues: number; missing: number }

const lineLabel = (line: string) => (/^[A-C]$/.test(line) ? `Ligne ${line}` : line === 'AEROPORT' ? 'Aéroport Express' : line === 'TRAM' ? 'Tram T1' : line === 'TELEO' ? 'Téléo' : line);

const PhotoExportModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const [metas, setMetas] = useState<PhotoMeta[] | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);
    const [scopeKind, setScopeKind] = useState<ScopeKind>('all');
    const [lieuId, setLieuId] = useState('');
    const [line, setLine] = useState('');
    const [includeHistory, setIncludeHistory] = useState(false);
    const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
    const [report, setReport] = useState<Report>({ delivered: 0, messages: [], integrityIssues: 0, missing: 0 });
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        setMetas(null); setScanError(null); setPhase({ kind: 'idle' });
        // Recensement à l'ouverture seulement (données lues à cet instant) :
        // une mise à jour des audits n'interrompt jamais un export en cours.
        scanPhotoMetadata(db, useAuditStore.getState().lieux)
            .then(result => { if (!cancelled) setMetas(result); })
            .catch(() => { if (!cancelled) setScanError("Lecture des photos impossible (stockage indisponible). Rien n'a été modifié."); });
        return () => { cancelled = true; abortRef.current?.abort(); };
    }, [isOpen]);

    const stations = useMemo(() => {
        const byId = new Map<string, string>();
        for (const m of metas ?? []) if (m.attached) byId.set(m.lieuId, m.stationName);
        return [...byId].sort((a, b) => a[1].localeCompare(b[1], 'fr'));
    }, [metas]);
    const lines = useMemo(() => [...new Set((metas ?? []).filter(m => m.attached && m.line).map(m => m.line!))].sort(), [metas]);

    const scope: PhotoExportScope | null = scopeKind === 'all' ? { kind: 'all' }
        : scopeKind === 'station' ? (lieuId ? { kind: 'station', lieuId } : null)
        : (line ? { kind: 'line', line } : null);
    const scopeLabel = scopeKind === 'all' ? 'tous-les-audits'
        : scopeKind === 'station' ? (stations.find(([id]) => id === lieuId)?.[1] ?? 'station') : `ligne-${line}`;
    const plan = useMemo(() => (metas && scope ? planPhotoExport(metas, scope, { includeHistory }) : null),
        // scope est recalculé à chaque rendu : ses composantes suffisent.
        [metas, scopeKind, lieuId, line, includeHistory]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!isOpen) return null;
    const busy = phase.kind === 'building' || phase.kind === 'delivering';
    const partCount = plan?.parts.length ?? 0;

    const buildPart = async (index: number) => {
        if (!plan || !scope) return;
        const controller = new AbortController();
        abortRef.current = controller;
        setPhase({ kind: 'building', part: index, done: 0, total: plan.parts[index].length });
        try {
            const built = await buildPhotoZipPart(db, plan, index, { scope, scopeLabel, includeHistory }, {
                signal: controller.signal,
                onProgress: p => setPhase({ kind: 'building', part: index, done: p.done, total: p.total }),
            });
            setReport(r => ({ ...r, integrityIssues: r.integrityIssues + built.integrityIssues, missing: r.missing + built.missing.length }));
            setPhase({ kind: 'ready', part: index, built });
        } catch (error) {
            if ((error as { name?: string })?.name === 'AbortError') {
                setPhase({ kind: 'error', message: "Export annulé — aucune photo n'a été modifiée." });
            } else {
                setPhase({ kind: 'error', message: error instanceof PhotoExportError ? error.message : "Échec de l'export. Aucune photo n'a été modifiée." });
            }
        } finally {
            abortRef.current = null;
        }
    };

    const start = () => { setReport({ delivered: 0, messages: [], integrityIssues: 0, missing: 0 }); void buildPart(0); };

    const deliver = async () => {
        if (phase.kind !== 'ready') return;
        const { part, built } = phase;
        setPhase({ kind: 'delivering', part, built });
        const file = new File([built.blob], built.fileName, { type: 'application/zip' });
        let message: string;
        let ok = false;
        try {
            const outcome = await deliverFile(file, built.fileName);
            message = deliveryMessage(outcome, 'zip');
            ok = outcome !== 'cancelled';
        } catch {
            message = "Impossible de transmettre l'archive. Aucune photo n'a été modifiée.";
        }
        const label = partCount > 1 ? `Partie ${part + 1}/${partCount} : ` : '';
        setReport(r => ({ ...r, delivered: r.delivered + (ok ? 1 : 0), messages: [...r.messages, label + message] }));
        if (!ok) { setPhase({ kind: 'ready', part, built }); return; } // réessayer la même partie
        if (part + 1 < partCount) void buildPart(part + 1); // la partie remise est libérée
        else setPhase({ kind: 'finished' });
    };

    const close = () => { abortRef.current?.abort(); onClose(); };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 dark:bg-black/80 transition-opacity z-50 flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" role="dialog" aria-modal="true" aria-labelledby="photo-export-title" onClick={busy ? undefined : close}>
            <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-lg bg-white dark:bg-slate-800 text-left shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-start gap-4 px-4 pt-5 sm:px-6">
                    <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/30">
                        <Camera className="h-6 w-6 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 id="photo-export-title" className="text-lg font-semibold text-gray-800 dark:text-slate-100">Exporter les photos originales</h3>
                        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Archive ZIP des fichiers d'origine (sans bandeau), avec inventaire. Sauvegarde externe : rien n'est supprimé de l'appareil.</p>
                    </div>
                    <button onClick={close} disabled={phase.kind === 'delivering'} className="rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 disabled:opacity-40" aria-label="Fermer"><X className="h-5 w-5" /></button>
                </div>

                <div className="px-4 py-4 sm:px-6 space-y-4">
                    {scanError && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{scanError}</p>}
                    {!metas && !scanError && <p className="text-sm text-gray-500 dark:text-slate-400" aria-live="polite">Recensement des photos…</p>}

                    {metas && (
                        <fieldset disabled={busy || phase.kind === 'ready'} className="space-y-3">
                            <legend className="text-xs font-semibold text-teal-700 dark:text-teal-400 uppercase tracking-wider">Périmètre</legend>
                            {([['station', 'Une station'], ['line', 'Une ligne'], ['all', 'Tous les audits']] as [ScopeKind, string][]).map(([kind, label]) => (
                                <label key={kind} className="flex items-center gap-3 text-sm text-gray-800 dark:text-slate-200 min-h-11">
                                    <input type="radio" name="photo-export-scope" value={kind} checked={scopeKind === kind} onChange={() => setScopeKind(kind)} className="h-4 w-4 text-teal-600 focus:ring-teal-600" />
                                    {label}
                                </label>
                            ))}
                            {scopeKind === 'station' && (
                                <select aria-label="Station" value={lieuId} onChange={e => setLieuId(e.target.value)} className="w-full rounded-md border-0 py-2 px-3 text-sm text-gray-900 dark:text-slate-100 dark:bg-slate-700 ring-1 ring-inset ring-gray-300 dark:ring-slate-600 focus:ring-2 focus:ring-teal-600">
                                    <option value="">{stations.length ? 'Choisir une station…' : 'Aucune station photographiée'}</option>
                                    {stations.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                                </select>
                            )}
                            {scopeKind === 'line' && (
                                <select aria-label="Ligne" value={line} onChange={e => setLine(e.target.value)} className="w-full rounded-md border-0 py-2 px-3 text-sm text-gray-900 dark:text-slate-100 dark:bg-slate-700 ring-1 ring-inset ring-gray-300 dark:ring-slate-600 focus:ring-2 focus:ring-teal-600">
                                    <option value="">{lines.length ? 'Choisir une ligne…' : 'Aucune ligne photographiée'}</option>
                                    {lines.map(l => <option key={l} value={l}>{lineLabel(l)}</option>)}
                                </select>
                            )}
                            <label className="flex items-start gap-3 text-sm text-gray-800 dark:text-slate-200 min-h-11 pt-1">
                                <input type="checkbox" checked={includeHistory} onChange={e => setIncludeHistory(e.target.checked)} className="mt-0.5 h-4 w-4 rounded text-teal-600 focus:ring-teal-600" />
                                <span>Inclure les photos historiques et orphelines
                                    <span className="block text-xs text-gray-500 dark:text-slate-400">Photos remplacées ou supprimées, et photos dont la station n'existe plus (classées « orphelines », jamais attribuées à une station).</span>
                                </span>
                            </label>
                        </fieldset>
                    )}

                    {plan && (
                        <p className="text-sm text-gray-700 dark:text-slate-300" data-testid="photo-export-estimate" aria-live="polite">
                            <strong>{plan.photos.length}</strong> photo{plan.photos.length > 1 ? 's' : ''} · {formatBytes(plan.totalBytes)}
                            {partCount > 1 && <> · {partCount} fichiers ZIP (≈ {formatBytes(DEFAULT_PART_BYTES)} max. chacun, pour la mémoire de l'appareil)</>}
                        </p>
                    )}
                    {plan && plan.photos.length === 0 && <p className="text-sm text-gray-500 dark:text-slate-400">Aucune photo pour ce périmètre.</p>}

                    {phase.kind === 'building' && (
                        <div className="space-y-2" aria-live="polite">
                            <p className="text-sm text-gray-700 dark:text-slate-300">
                                {partCount > 1 ? `Partie ${phase.part + 1}/${partCount} — ` : ''}Préparation : {phase.done}/{phase.total} photos
                            </p>
                            <div className="h-2 rounded-full bg-gray-200 dark:bg-slate-700" role="progressbar" aria-valuemin={0} aria-valuemax={phase.total} aria-valuenow={phase.done} aria-label="Progression de l'export">
                                <div className="h-2 rounded-full bg-teal-600 transition-[width]" style={{ width: `${phase.total ? (phase.done / phase.total) * 100 : 0}%` }} />
                            </div>
                        </div>
                    )}
                    {(phase.kind === 'ready' || phase.kind === 'delivering') && (
                        <p className="text-sm text-gray-700 dark:text-slate-300" role="status">
                            {partCount > 1 ? `Partie ${phase.part + 1}/${partCount} prête` : 'Archive prête'} : {phase.built.rows.length} photo{phase.built.rows.length > 1 ? 's' : ''}, {formatBytes(phase.built.blob.size)}. Choisir où enregistrer le fichier.
                        </p>
                    )}
                    {phase.kind === 'error' && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{phase.message}</p>}
                    {(report.integrityIssues > 0 || report.missing > 0) && (
                        <p role="alert" className="flex gap-2 text-sm text-amber-800 dark:text-amber-300">
                            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                            <span>
                                {report.integrityIssues > 0 && `${report.integrityIssues} photo(s) dont l'empreinte diffère de celle enregistrée (colonne « Intégrité » de l'inventaire). `}
                                {report.missing > 0 && `${report.missing} photo(s) introuvable(s) au moment de l'export (listées dans manifest.json).`}
                            </span>
                        </p>
                    )}
                    {report.messages.length > 0 && (
                        <ul className="space-y-1 text-sm text-gray-700 dark:text-slate-300" data-testid="photo-export-messages" aria-live="polite">
                            {report.messages.map((m, i) => <li key={i}>{m}</li>)}
                        </ul>
                    )}
                    {phase.kind === 'finished' && (
                        <p role="status" className="text-sm font-medium text-teal-800 dark:text-teal-300">
                            Export terminé : {plan?.photos.length ?? 0} photo(s) en {partCount} fichier(s) remis. Rien n'a été supprimé de l'appareil.
                        </p>
                    )}
                </div>

                <div className="flex flex-col-reverse gap-2 px-4 pb-5 sm:px-6 sm:flex-row sm:justify-end">
                    {phase.kind === 'building' ? (
                        <button onClick={() => abortRef.current?.abort()} className="inline-flex min-h-11 items-center justify-center rounded-md px-3 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:text-slate-200 dark:ring-slate-600 dark:hover:bg-slate-700">Annuler l'export</button>
                    ) : (
                        <button onClick={close} disabled={phase.kind === 'delivering'} className="inline-flex min-h-11 items-center justify-center rounded-md px-3 py-2 text-sm font-semibold text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:text-slate-200 dark:ring-slate-600 dark:hover:bg-slate-700 disabled:opacity-50">Fermer</button>
                    )}
                    {(phase.kind === 'idle' || phase.kind === 'error') && (
                        <button onClick={start} disabled={!plan || plan.photos.length === 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:opacity-50">
                            <Download className="h-4 w-4" aria-hidden="true" /> Exporter les photos originales
                        </button>
                    )}
                    {(phase.kind === 'ready' || phase.kind === 'delivering') && (
                        <button onClick={deliver} disabled={phase.kind === 'delivering'} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:opacity-50">
                            <Download className="h-4 w-4" aria-hidden="true" /> {partCount > 1 ? `Enregistrer la partie ${phase.part + 1}/${partCount}` : 'Enregistrer le ZIP'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PhotoExportModal;

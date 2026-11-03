import React, { useEffect, useState } from 'react';
import { AlertTriangle, CloudOff, Download, RefreshCw } from 'lucide-react';
import { db } from '../db';
import useAuditStore from '../store';
import { exportLieuxToJson } from '../utils/csvExporter';
import { applyUpdate, usePwaState } from '../utils/pwa/pwaState';
import { flushPendingWrites, unsavedInputReason } from '../utils/pwa/unsavedInput';

// Bandeaux PWA (bas d'écran) : base fermée par une version plus récente,
// montée de version bloquée, mode hors connexion pas prêt, mise à jour
// disponible. Une mise à jour n'est JAMAIS appliquée sans clic, ni pendant
// une saisie non enregistrée, ni sans sauvegarde locale vérifiée (ou choix
// explicite de l'utilisateur après échec de cette sauvegarde).

type UpdateStep =
    | { kind: 'idle' }
    | { kind: 'busy'; message: string }
    | { kind: 'blocked'; reason: string }
    | { kind: 'backupFailed' };

const useOnline = (): boolean => {
    const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
    useEffect(() => {
        const on = () => setOnline(true);
        const off = () => setOnline(false);
        window.addEventListener('online', on);
        window.addEventListener('offline', off);
        return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
    }, []);
    return online;
};

const Banner: React.FC<{ tone: 'info' | 'warning' | 'danger'; icon: React.ReactNode; children: React.ReactNode; role?: 'status' | 'alert'; testId: string }> = ({ tone, icon, children, role = 'status', testId }) => {
    const tones = {
        info: 'bg-teal-700 text-white',
        warning: 'bg-amber-50 text-amber-900 ring-1 ring-amber-300 dark:bg-amber-900/90 dark:text-amber-50 dark:ring-amber-700',
        danger: 'bg-red-50 text-red-900 ring-1 ring-red-300 dark:bg-red-900/90 dark:text-red-50 dark:ring-red-700',
    };
    return (
        <div role={role} data-testid={testId} className={`pointer-events-auto w-full rounded-xl shadow-lg px-4 py-3 text-sm ${tones[tone]}`}>
            <div className="flex items-start gap-3">
                <span className="mt-0.5 flex-shrink-0">{icon}</span>
                <div className="min-w-0 flex-1 space-y-2">{children}</div>
            </div>
        </div>
    );
};

const buttonClass = (primary: boolean) => primary
    ? 'inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-sm font-semibold text-teal-800 shadow-sm hover:bg-teal-50 disabled:opacity-60 min-h-11'
    : 'inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium underline-offset-2 hover:underline disabled:opacity-60 min-h-11';

export const PwaStatus: React.FC = () => {
    const pwa = usePwaState();
    const online = useOnline();
    const backupBeforeUpdate = useAuditStore(s => s.backupBeforeUpdate);
    const [step, setStep] = useState<UpdateStep>({ kind: 'idle' });
    const [dismissed, setDismissed] = useState(false);
    const [notReadyHidden, setNotReadyHidden] = useState(false);

    const startUpdate = async (skipBackup = false) => {
        const reason = unsavedInputReason();
        if (reason) { setStep({ kind: 'blocked', reason }); return; }
        setStep({ kind: 'busy', message: 'Enregistrement des dernières saisies…' });
        try {
            await flushPendingWrites(db);
        } catch {
            setStep({ kind: 'blocked', reason: "les dernières saisies n'ont pas pu être confirmées" });
            return;
        }
        if (!skipBackup) {
            setStep({ kind: 'busy', message: 'Sauvegarde de sécurité…' });
            const key = await backupBeforeUpdate().catch(() => '');
            if (!key) { setStep({ kind: 'backupFailed' }); return; }
        }
        const lateReason = unsavedInputReason();
        if (lateReason) { setStep({ kind: 'blocked', reason: lateReason }); return; }
        setStep({ kind: 'busy', message: 'Mise à jour…' });
        await applyUpdate();
    };

    const showNotReady = !notReadyHidden && (pwa.offline === 'error' || (pwa.offline === 'installing' && !online));
    const showUpdate = pwa.updateAvailable && !dismissed && !pwa.dbClosedByNewerVersion;
    if (!pwa.dbClosedByNewerVersion && !pwa.dbUpgradeBlocked && !showNotReady && !showUpdate) return null;

    const busy = step.kind === 'busy';
    return (
        <div data-pwa-banner className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <div className="w-full max-w-xl space-y-2">
                {pwa.dbClosedByNewerVersion && (
                    <Banner tone="danger" role="alert" icon={<AlertTriangle className="w-5 h-5" />} testId="pwa-db-closed">
                        <p className="font-semibold">AuditRef a été mis à jour dans un autre onglet.</p>
                        <p>Cet onglet ne peut plus enregistrer. Rechargez-le pour continuer : les relevés déjà enregistrés sont conservés.</p>
                        <button type="button" className={buttonClass(false)} onClick={() => window.location.reload()}>
                            <RefreshCw className="w-4 h-4" /> Recharger cet onglet
                        </button>
                    </Banner>
                )}
                {pwa.dbUpgradeBlocked && !pwa.dbClosedByNewerVersion && (
                    <Banner tone="warning" role="alert" icon={<AlertTriangle className="w-5 h-5" />} testId="pwa-db-blocked">
                        <p className="font-semibold">Mise à jour de la base en attente.</p>
                        <p>Fermez les autres onglets ou fenêtres AuditRef encore ouverts ; aucune donnée n'est modifiée en attendant.</p>
                    </Banner>
                )}
                {showNotReady && (
                    <Banner tone="warning" role="alert" icon={<CloudOff className="w-5 h-5" />} testId="pwa-not-ready">
                        <p className="font-semibold">Pas prêt pour une utilisation hors connexion.</p>
                        <p>
                            {pwa.offline === 'error'
                                ? `Raison : ${pwa.offlineError ?? 'installation incomplète'}.`
                                : "Le téléchargement des ressources n'a pas pu se terminer."}
                            {' '}Avant de partir sur le terrain, gardez la connexion et rechargez l'application.
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {online && (
                                <button type="button" className={buttonClass(false)} onClick={() => window.location.reload()}>
                                    <RefreshCw className="w-4 h-4" /> Recharger
                                </button>
                            )}
                            <button type="button" className={buttonClass(false)} onClick={() => setNotReadyHidden(true)}>Masquer</button>
                        </div>
                    </Banner>
                )}
                {showUpdate && (
                    <Banner tone="info" icon={<Download className="w-5 h-5" />} testId="pwa-update">
                        <p className="font-semibold">Nouvelle version disponible</p>
                        {step.kind === 'blocked' && (
                            <p className="rounded-md bg-white/15 px-2 py-1" role="alert">Mise à jour reportée : {step.reason}. Terminez ou enregistrez la saisie, puis réessayez.</p>
                        )}
                        {step.kind === 'busy' && <p aria-live="polite">{step.message}</p>}
                        {step.kind === 'backupFailed' ? (
                            <>
                                <p className="rounded-md bg-white/15 px-2 py-1" role="alert">
                                    La sauvegarde de sécurité n'a pas pu être vérifiée (stockage du navigateur plein ou indisponible).
                                    Téléchargez d'abord une sauvegarde de vos relevés.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <button type="button" className={buttonClass(true)} onClick={() => { void exportLieuxToJson(); }}>
                                        <Download className="w-4 h-4" /> Télécharger une sauvegarde (.json)
                                    </button>
                                    <button type="button" className={buttonClass(false)} onClick={() => { void startUpdate(true); }}>
                                        Mettre à jour sans sauvegarde locale
                                    </button>
                                    <button type="button" className={buttonClass(false)} onClick={() => setStep({ kind: 'idle' })}>Annuler</button>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                <button type="button" className={buttonClass(true)} disabled={busy} aria-busy={busy} onClick={() => { void startUpdate(); }}>
                                    <RefreshCw className={`w-4 h-4 ${busy ? 'animate-spin' : ''}`} /> Mettre à jour
                                </button>
                                <button type="button" className={buttonClass(false)} disabled={busy} onClick={() => { setDismissed(true); setStep({ kind: 'idle' }); }}>
                                    Plus tard
                                </button>
                            </div>
                        )}
                    </Banner>
                )}
            </div>
        </div>
    );
};

export default PwaStatus;

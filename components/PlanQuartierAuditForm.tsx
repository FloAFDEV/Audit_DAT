import React, { useMemo, useState } from 'react';
import { AuditModule, AdhesiveStatus, PlanQuartierData, PlanQuartierOccurrence, SignageReference, SignageSupport, SignageDimensions } from '../types';
import { CheckCircle2, XCircle, AlertTriangle, Ban, Trash2, PlusCircle, History, RotateCcw, ShieldCheck, Ruler } from 'lucide-react';
import AuditFormLayout from './AuditFormLayout';
import { ModuleIcon } from './ModuleIcon';
import { formatDimensions, STATUS_LABELS } from './cockpit/labels';

interface PlanQuartierAuditFormProps {
  module: AuditModule;
  signageReferences: SignageReference[];
  onAddOccurrence: (input: { modelId?: string; adHocLabel?: string; adHocSupport?: SignageSupport; location?: string }) => void;
  onRemoveOccurrence: (occurrenceId: string) => void;
  onStatusChange: (occurrenceId: string, status: AdhesiveStatus) => void;
  onOccurrenceCommentChange: (occurrenceId: string, comment: string) => void;
  onLocationChange: (occurrenceId: string, location: string) => void;
  onMeasuredDimensionsChange: (occurrenceId: string, dimensions: SignageDimensions | undefined) => void;
  onNewConstat: (occurrenceId: string) => void;
  onMarkChecked: () => void;
  onCommentChange: (comment: string) => void;
  onReset: () => void;
  onBack: () => void;
}

const STATUS_BUTTONS: { status: AdhesiveStatus; label: string; Icon: typeof CheckCircle2; activeClass: string; idleClass: string }[] = [
  { status: AdhesiveStatus.OK, label: 'OK', Icon: CheckCircle2,
    activeClass: 'bg-teal-600 text-white shadow-sm dark:bg-teal-500',
    idleClass: 'bg-white text-teal-700 ring-1 ring-inset ring-teal-500 hover:bg-teal-50 dark:bg-slate-700/50 dark:text-teal-300 dark:ring-slate-600 dark:hover:bg-slate-700' },
  { status: AdhesiveStatus.Absent, label: 'Absent', Icon: XCircle,
    activeClass: 'bg-red-600 text-white shadow-sm dark:bg-red-500',
    idleClass: 'bg-white text-red-700 ring-1 ring-inset ring-red-600 hover:bg-red-50 dark:bg-slate-700/50 dark:text-red-300 dark:ring-slate-600 dark:hover:bg-slate-700' },
  { status: AdhesiveStatus.ToBeReplaced, label: 'À remplacer', Icon: AlertTriangle,
    activeClass: 'bg-amber-500 text-white shadow-sm',
    idleClass: 'bg-white text-amber-600 ring-1 ring-inset ring-amber-500 hover:bg-amber-50 dark:bg-slate-700/50 dark:text-amber-300 dark:ring-slate-600 dark:hover:bg-slate-700' },
  { status: AdhesiveStatus.NotApplicable, label: 'Non applicable', Icon: Ban,
    activeClass: 'bg-slate-500 text-white shadow-sm dark:bg-slate-600',
    idleClass: 'bg-white text-slate-600 ring-1 ring-inset ring-slate-400 hover:bg-slate-50 dark:bg-slate-700/50 dark:text-slate-300 dark:ring-slate-500 dark:hover:bg-slate-700' },
];

const SUPPORT_OPTIONS: SignageSupport[] = ['plastifie', 'adhesif', 'dibond', 'pvc', 'vitrophanie', 'autre'];

const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
};

const PlanQuartierAuditForm: React.FC<PlanQuartierAuditFormProps> = (props) => {
  const {
    module, signageReferences, onAddOccurrence, onRemoveOccurrence, onStatusChange, onOccurrenceCommentChange,
    onLocationChange, onMeasuredDimensionsChange, onNewConstat, onMarkChecked, onCommentChange, onReset, onBack,
  } = props;
  const data = module.data as PlanQuartierData;

  // Catalogue figé (signageReferences, scope PDQ) — jamais administrable
  // depuis cet écran, cf. types.ts en-tête.
  const models = useMemo(
    () => signageReferences.filter(r => r.scope.auditType === 'PDQ' && !r.isDisabled),
    [signageReferences]
  );

  const occurrencesByModel = useMemo(() => {
    const map = new Map<string, PlanQuartierOccurrence[]>();
    for (const occ of data.occurrences) {
      if (!occ.modelId) continue;
      const list = map.get(occ.modelId) ?? [];
      list.push(occ);
      map.set(occ.modelId, list);
    }
    return map;
  }, [data.occurrences]);

  const adHocOccurrences = useMemo(
    () => data.occurrences.filter(occ => !occ.modelId),
    [data.occurrences]
  );

  // Ratio sur les exemplaires réellement contrôlés — un exemplaire connu dès
  // le premier recensement (statut Non contrôlé) ne compte pas comme audité
  // tant que son état réel n'a pas été renseigné sur le terrain.
  const relevantOccurrences = data.occurrences.filter(o => o.status !== AdhesiveStatus.NotApplicable);
  const progress = relevantOccurrences.length > 0
    ? (relevantOccurrences.filter(o => o.status !== AdhesiveStatus.NotChecked).length / relevantOccurrences.length) * 100
    : (data.lastCheckedAt ? 100 : 0);

  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});
  const [draftLocations, setDraftLocations] = useState<Record<string, string>>({});
  const [showAdHocForm, setShowAdHocForm] = useState(false);
  const [adHocLabel, setAdHocLabel] = useState('');
  const [adHocSupport, setAdHocSupport] = useState<SignageSupport>('autre');
  const [adHocLocation, setAdHocLocation] = useState('');

  const handleAddAdHoc = () => {
    if (!adHocLabel.trim()) return;
    onAddOccurrence({ adHocLabel, adHocSupport, location: adHocLocation });
    setAdHocLabel('');
    setAdHocLocation('');
    setShowAdHocForm(false);
  };

  const renderOccurrence = (occ: PlanQuartierOccurrence, refLabel: string) => {
    const isBlank = occ.status === AdhesiveStatus.NotChecked && !occ.comment && !occ.measuredDimensions
      && (occ.previousConstats ?? []).length === 0;
    const history = occ.previousConstats ?? [];
    const historyOpen = !!expandedHistory[occ.id];

    return (
      <li key={occ.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={occ.location ?? ''}
                onChange={(e) => onLocationChange(occ.id, e.target.value)}
                placeholder="Emplacement (ex. Quai direction X)"
                className="text-sm font-medium text-slate-800 dark:text-slate-100 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 focus:outline-none focus:border-teal-500 py-0.5"
              />
              {isBlank && (
                <button
                  onClick={() => onRemoveOccurrence(occ.id)}
                  className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Retirer (erreur de saisie — aucun constat encore saisi)"
                  aria-label="Retirer cet exemplaire"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Constat du {formatDate(occ.constatedAt)} · recensé le {formatDate(occ.discoveredAt)}
              {history.length > 0 && (
                <button
                  onClick={() => setExpandedHistory(prev => ({ ...prev, [occ.id]: !prev[occ.id] }))}
                  className="ml-2 inline-flex items-center gap-1 text-teal-600 dark:text-teal-400 hover:underline"
                >
                  <History className="w-3.5 h-3.5" /> Historique ({history.length})
                </button>
              )}
            </p>
            {historyOpen && (
              <ul className="mt-2 space-y-1 border-l-2 border-slate-200 dark:border-slate-700 pl-3">
                {[...history].reverse().map((c, i) => (
                  <li key={i} className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold">{formatDate(c.constatedAt)}</span> — {STATUS_LABELS[c.status] ?? c.status}
                    {c.comment && <span className="italic"> · {c.comment}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex-shrink-0 flex items-center flex-wrap justify-start sm:justify-end gap-3">
            {STATUS_BUTTONS.map(({ status, label, Icon, activeClass, idleClass }) => (
              <button
                key={status}
                onClick={() => onStatusChange(occ.id, occ.status === status ? AdhesiveStatus.NotChecked : status)}
                className={`flex items-center justify-center px-3 py-1.5 text-sm font-normal rounded-md transition-all duration-75 active:scale-95 whitespace-nowrap ${occ.status === status ? activeClass : idleClass}`}
              >
                <Icon className="w-5 h-5 mr-2" /> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-slate-700">
          <textarea
            value={occ.comment ?? ''}
            onChange={(e) => onOccurrenceCommentChange(occ.id, e.target.value)}
            placeholder="Commentaire sur cet exemplaire (facultatif)..."
            rows={1}
            className="w-full text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-md p-2 resize-none focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Ruler className="w-3.5 h-3.5" /> Mesure particulière :
            </label>
            <input
              type="text"
              defaultValue={occ.measuredDimensions ? `${occ.measuredDimensions.width ?? ''}x${occ.measuredDimensions.height ?? ''}` : ''}
              placeholder={`ex. ${refLabel.includes('78') ? '78x119' : '78x100'}`}
              onBlur={(e) => {
                const m = e.target.value.trim().match(/^(\d+(?:[.,]\d+)?)\s*[xX]\s*(\d+(?:[.,]\d+)?)$/);
                if (!m) { if (!e.target.value.trim()) onMeasuredDimensionsChange(occ.id, undefined); return; }
                onMeasuredDimensionsChange(occ.id, { width: parseFloat(m[1].replace(',', '.')), height: parseFloat(m[2].replace(',', '.')), unit: 'cm' });
              }}
              className="text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 w-28 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <button
              onClick={() => onNewConstat(occ.id)}
              disabled={occ.status === AdhesiveStatus.NotChecked}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
              title={occ.status === AdhesiveStatus.NotChecked ? 'Aucun constat à archiver pour l\'instant' : 'Archiver ce constat et démarrer un nouveau relevé'}
            >
              <RotateCcw className="w-4 h-4" /> Nouveau constat
            </button>
          </div>
        </div>
      </li>
    );
  };

  return (
    <AuditFormLayout
      module={module}
      customIcon={<ModuleIcon type={module.type} className="w-8 h-8 text-gray-700 dark:text-slate-300 flex-shrink-0" />}
      title={module.name}
      subtitle={
        <p className="text-gray-600 dark:text-slate-400 text-sm">
          <span className="font-semibold text-gray-800 dark:text-slate-200">Station :</span> {data.stationName}
        </p>
      }
      progress={progress}
      onBack={onBack}
      onReset={onReset}
      resetConfirmTitle="Réinitialiser l'audit"
      resetConfirmMessage={`Êtes-vous sûr de vouloir réinitialiser « ${module.name} » ?\n\nStation : ${data.stationName}\n\nTous les exemplaires recensés et leur historique de constats seront supprimés (une trace reste dans Archives).`}
      comment={data.comment}
      onCommentChange={onCommentChange}
    >
      {data.occurrences.length === 0 && (
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-dashed border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {data.lastCheckedAt
              ? <>Dernière vérification le {formatDate(data.lastCheckedAt)} — aucun élément trouvé.</>
              : <>Cette station n'a pas encore été vérifiée pour cet audit.</>}
          </p>
          <button
            onClick={onMarkChecked}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 dark:bg-slate-700/50 dark:text-slate-200 dark:ring-slate-600 dark:hover:bg-slate-700 whitespace-nowrap"
          >
            <ShieldCheck className="w-4 h-4" /> Confirmer : aucun élément trouvé
          </button>
        </div>
      )}

      <ul className="divide-y divide-gray-200 dark:divide-slate-700">
        {models.map((ref) => {
          const occurrences = occurrencesByModel.get(ref.id) ?? [];
          const dimensions = formatDimensions(ref.dimensions);
          const draft = draftLocations[ref.id] ?? '';

          return (
            <li key={ref.id} className="bg-slate-50/50 dark:bg-slate-900/20">
              <div className="p-6 pb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                    {ref.name}
                    <span className="text-base font-normal text-slate-400 dark:text-slate-500 ml-2">
                      // <span className="font-medium text-slate-600 dark:text-slate-400">{dimensions}</span>
                    </span>
                  </h3>
                </div>
                <span className="flex-shrink-0 text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-900/30 px-2 py-1 rounded-full">
                  {occurrences.length} recensé{occurrences.length > 1 ? 's' : ''}
                </span>
              </div>
              <ul className="divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                {occurrences.map(occ => renderOccurrence(occ, ref.name))}
              </ul>
              <div className="p-4 flex items-center gap-2">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraftLocations(prev => ({ ...prev, [ref.id]: e.target.value }))}
                  placeholder="Emplacement du nouvel exemplaire (facultatif)"
                  className="flex-1 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <button
                  onClick={() => { onAddOccurrence({ modelId: ref.id, location: draft }); setDraftLocations(prev => ({ ...prev, [ref.id]: '' })); }}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-teal-600 text-white hover:bg-teal-500 whitespace-nowrap"
                >
                  <PlusCircle className="w-4 h-4" /> Ajouter un exemplaire
                </button>
              </div>
            </li>
          );
        })}

        {(adHocOccurrences.length > 0 || showAdHocForm) && (
          <li className="bg-amber-50/60 dark:bg-amber-900/10">
            <div className="p-6 pb-3">
              <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                Découvertes non cataloguées ({adHocOccurrences.length})
              </h3>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Élément trouvé sur le terrain qui ne correspond à aucun modèle connu — reste compté et audité normalement, à intégrer au référentiel lors d'une prochaine mise à jour du code.
              </p>
            </div>
            <ul className="divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
              {adHocOccurrences.map(occ => renderOccurrence(occ, occ.adHocLabel ?? 'découverte'))}
            </ul>
          </li>
        )}

        <li className="p-4">
          {!showAdHocForm ? (
            <button
              onClick={() => setShowAdHocForm(true)}
              className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-300 hover:underline"
            >
              <PlusCircle className="w-4 h-4" /> Élément trouvé qui ne correspond à aucun modèle ci-dessus
            </button>
          ) : (
            <div className="p-4 rounded-lg bg-amber-50/60 dark:bg-amber-900/10 space-y-2">
              <input
                type="text"
                value={adHocLabel}
                onChange={(e) => setAdHocLabel(e.target.value)}
                placeholder="Description libre (obligatoire)"
                className="w-full text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <div className="flex flex-wrap gap-2">
                <select
                  value={adHocSupport}
                  onChange={(e) => setAdHocSupport(e.target.value as SignageSupport)}
                  className="text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5"
                >
                  {SUPPORT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input
                  type="text"
                  value={adHocLocation}
                  onChange={(e) => setAdHocLocation(e.target.value)}
                  placeholder="Emplacement (facultatif)"
                  className="flex-1 min-w-[160px] text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowAdHocForm(false)} className="px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md">Annuler</button>
                <button onClick={handleAddAdHoc} disabled={!adHocLabel.trim()} className="px-3 py-1.5 text-sm font-medium rounded-md bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-40">Ajouter</button>
              </div>
            </div>
          )}
        </li>
      </ul>
    </AuditFormLayout>
  );
};

export default PlanQuartierAuditForm;

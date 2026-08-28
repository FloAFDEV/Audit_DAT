import React, { useMemo, useRef, useState } from 'react';
import { AuditModule, AdhesiveStatus, CustomAuditData, CustomAuditOccurrence, SignageReference } from '../types';
import { CheckCircle2, XCircle, AlertTriangle, Ban, MapPin, Camera, Trash2, Edit2, Edit, PlusCircle, History, RotateCcw, ShieldCheck } from 'lucide-react';
import AuditFormLayout from './AuditFormLayout';
import { ModuleIcon } from './ModuleIcon';
import { showPromiseToast } from './ToastManager';
import PhotoViewerModal from './PhotoViewerModal';
import { getEffectiveCustomReferences, getCustomAuditProgress } from '../utils/effectiveAdhesives';
import { formatDimensions, STATUS_LABELS } from './cockpit/labels';
import { getCustomAuditType } from '../data/customAudits';

interface CustomAuditFormProps {
  module: AuditModule;
  signageReferences: SignageReference[];
  onAddOccurrence: (referenceId: string, location?: string) => void;
  onRemoveOccurrence: (occurrenceId: string) => void;
  onStatusChange: (occurrenceId: string, status: AdhesiveStatus) => void;
  onOccurrenceCommentChange: (occurrenceId: string, comment: string) => void;
  onLocationChange: (occurrenceId: string, location: string) => void;
  onNewConstat: (occurrenceId: string) => void;
  onPhotoChange: (occurrenceId: string, photo_base64: string | null) => void;
  onPhotoNoteChange: (occurrenceId: string, note: string) => void;
  onPhotoRotationChange: (occurrenceId: string, rotation: number) => void;
  onMarkChecked: () => void;
  onCommentChange: (comment: string) => void;
  onReset: () => void;
  onBack: () => void;
}

const resizeImage = (file: File, maxSize: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) { height *= maxSize / width; width = maxSize; }
        } else {
          if (height > maxSize) { width *= maxSize / height; height = maxSize; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Impossible d\'obtenir le contexte du canvas.'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
};

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

const CustomAuditForm: React.FC<CustomAuditFormProps> = (props) => {
  const {
    module, signageReferences, onAddOccurrence, onRemoveOccurrence, onStatusChange, onOccurrenceCommentChange,
    onLocationChange, onNewConstat, onPhotoChange, onPhotoNoteChange, onPhotoRotationChange, onMarkChecked,
    onCommentChange, onReset, onBack,
  } = props;
  const data = module.data as CustomAuditData;

  // L'icône de l'audit n'est pas dénormalisée sur le module (seul son nom
  // l'est, cf. createBlankCustomModule) : lue à la demande dans le
  // registre en dur (data/customAudits.ts) — un audit introuvable
  // (import ancien, audit retiré du registre) retombe simplement sur
  // l'icône générique CUSTOM.
  const definition = useMemo(() => getCustomAuditType(data.definitionId), [data.definitionId]);

  // Références réellement effectives pour CETTE définition (archivées/
  // désactivées déjà exclues) — c'est la liste des TYPES d'objets
  // proposés au recensement, indépendante des occurrences déjà saisies.
  const references = useMemo(
    () => getEffectiveCustomReferences(signageReferences, data.definitionId),
    [signageReferences, data.definitionId]
  );

  // Occurrences groupées par référence — une occurrence dont la référence
  // a depuis été archivée reste affichée à part (jamais perdue), avec un
  // avertissement plutôt qu'une disparition silencieuse.
  const occurrencesByRef = useMemo(() => {
    const map = new Map<string, CustomAuditOccurrence[]>();
    for (const occ of data.occurrences) {
      const list = map.get(occ.referenceId) ?? [];
      list.push(occ);
      map.set(occ.referenceId, list);
    }
    return map;
  }, [data.occurrences]);

  const orphanOccurrences = useMemo(
    () => data.occurrences.filter(occ => !references.some(r => r.id === occ.referenceId)),
    [data.occurrences, references]
  );

  const progress = useMemo(() => getCustomAuditProgress(data), [data]);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currentOccurrenceId = useRef<string | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<CustomAuditOccurrence | null>(null);
  const [draftLocations, setDraftLocations] = useState<Record<string, string>>({});
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});

  const handlePhotoUploadClick = (occurrenceId: string) => {
    currentOccurrenceId.current = occurrenceId;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && currentOccurrenceId.current) {
      const occurrenceId = currentOccurrenceId.current;
      const promise = resizeImage(file, 1024).then(base64 => {
        onPhotoChange(occurrenceId, base64);
      });
      showPromiseToast(
        promise,
        { icon: <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500"></div>, title: "Traitement de l'image...", message: "Compression en cours." },
        { icon: <div className="h-full w-full rounded-full bg-teal-500 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-white" /></div>, title: "Photo ajoutée", message: "L'image a été enregistrée avec succès." },
        { icon: <div className="h-full w-full rounded-full bg-red-500 flex items-center justify-center"><XCircle className="h-5 w-5 text-white" /></div>, title: "Erreur", message: "Impossible de traiter l'image." }
      );
    }
    if (event.target) event.target.value = '';
  };

  const renderOccurrence = (occ: CustomAuditOccurrence, refLabel: string) => {
    const isBlank = occ.status === AdhesiveStatus.NotChecked && !occ.comment && !occ.photo_base64 && (occ.previousConstats ?? []).length === 0;
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
                placeholder="Emplacement (ex. Entrée rue X)"
                className="text-sm font-medium text-slate-800 dark:text-slate-100 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 focus:outline-none focus:border-teal-500 py-0.5"
              />
              {isBlank && (
                <button
                  onClick={() => onRemoveOccurrence(occ.id)}
                  className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Retirer (erreur de saisie — aucun constat encore saisi)"
                  aria-label="Retirer cet objet"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Constat du {formatDate(occ.constatedAt)}
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
            placeholder="Commentaire sur cet objet (facultatif)..."
            rows={1}
            className="w-full text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-md p-2 resize-none focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <button
              onClick={() => handlePhotoUploadClick(occ.id)}
              className={`flex items-center justify-center text-sm font-medium transition-all duration-75 active:scale-95 ${
                occ.photo_base64
                  ? 'p-2 rounded-full bg-white text-indigo-700 ring-1 ring-inset ring-indigo-500 hover:bg-indigo-50 dark:bg-slate-700/50 dark:text-indigo-300 dark:ring-slate-600 dark:hover:bg-slate-700'
                  : 'px-3 py-1.5 rounded-md bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 whitespace-nowrap'
              }`}
              title={occ.photo_base64 ? 'Remplacer la photo' : 'Ajouter une photo'}
            >
              {occ.photo_base64 ? <Edit className="w-5 h-5" /> : (<><Camera className="w-5 h-5 mr-2" /><span>Ajouter une photo</span></>)}
            </button>
            {occ.photo_base64 && (
              <button
                onClick={() => onPhotoChange(occ.id, null)}
                className="p-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                aria-label="Supprimer la photo"
                title="Supprimer la photo"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => onNewConstat(occ.id)}
              disabled={occ.status === AdhesiveStatus.NotChecked}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
              title={occ.status === AdhesiveStatus.NotChecked ? 'Aucun constat à archiver pour l\'instant' : 'Archiver ce constat et démarrer un nouveau relevé'}
            >
              <RotateCcw className="w-4 h-4" /> Nouveau constat
            </button>
          </div>
          {occ.photo_base64 && (
            <div className="flex items-start gap-4 w-full mt-3">
              <button onClick={() => setViewingPhoto(occ)} className="flex-shrink-0 relative group">
                <img
                  src={occ.photo_base64}
                  alt={`Photo — ${refLabel}`}
                  className="w-24 h-24 rounded-md object-cover shadow-sm transition-transform duration-75"
                  style={{ transform: `rotate(${occ.photo_rotation || 0}deg)` }}
                />
                <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                  <Edit2 className="w-6 h-6 text-white" />
                </div>
              </button>
              <div className="flex-1">
                {occ.photo_note ? (
                  <p className="text-sm text-gray-600 dark:text-slate-300 italic p-3 bg-slate-100 dark:bg-slate-700/50 rounded-md whitespace-pre-wrap">{occ.photo_note}</p>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-slate-500 italic">Aucune note pour cette photo.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </li>
    );
  };

  return (
    <>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />
      <AuditFormLayout
        module={module}
        customIcon={<ModuleIcon type={module.type} customAuditIconKey={definition?.icon} className="w-8 h-8 text-gray-700 dark:text-slate-300 flex-shrink-0" />}
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
        resetConfirmMessage={`Êtes-vous sûr de vouloir réinitialiser « ${module.name} » ?\n\nStation : ${data.stationName}\n\nTous les objets recensés et leur historique de constats seront supprimés (une trace reste dans Archives).`}
        comment={data.comment}
        onCommentChange={onCommentChange}
      >
        {references.length === 0 && data.occurrences.length === 0 ? (
          <div className="p-6 text-center bg-slate-50 dark:bg-slate-800/50">
            <ShieldCheck className="mx-auto h-12 w-12 text-gray-400 dark:text-slate-500" />
            <h3 className="mt-2 text-lg font-semibold text-gray-900 dark:text-slate-100">Aucune référence pour cet audit</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400 max-w-md mx-auto">
              Ajoutez des références à « {module.name} » depuis l'Admin (onglet Audits configurables) pour pouvoir recenser des objets ici.
            </p>
          </div>
        ) : (
          <>
            {data.occurrences.length === 0 && (
              <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-b border-dashed border-gray-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {data.lastCheckedAt
                    ? <>Dernière vérification le {formatDate(data.lastCheckedAt)} — aucun objet trouvé.</>
                    : <>Cette station n'a pas encore été vérifiée pour cet audit.</>}
                </p>
                <button
                  onClick={onMarkChecked}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 dark:bg-slate-700/50 dark:text-slate-200 dark:ring-slate-600 dark:hover:bg-slate-700 whitespace-nowrap"
                >
                  <ShieldCheck className="w-4 h-4" /> Confirmer : aucun objet trouvé
                </button>
              </div>
            )}
            <ul className="divide-y divide-gray-200 dark:divide-slate-700">
              {references.map((ref) => {
                const occurrences = occurrencesByRef.get(ref.id) ?? [];
                const dimensions = formatDimensions(ref.dimensions);
                const hasDimensions = dimensions !== '—';
                const draft = draftLocations[ref.id] ?? '';

                return (
                  <li key={ref.id} className="bg-slate-50/50 dark:bg-slate-900/20">
                    <div className="p-6 pb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                          {ref.name}
                          {(hasDimensions || ref.material) && (
                            <span className="text-base font-normal text-slate-400 dark:text-slate-500 ml-2">
                              // <span className="font-medium text-slate-600 dark:text-slate-400">
                                {[hasDimensions ? dimensions : null, ref.material].filter(Boolean).join(' — ')}
                              </span>
                            </span>
                          )}
                        </h3>
                        {ref.placement?.zone && (
                          <div className="flex items-start text-sm font-light text-slate-500 dark:text-slate-400 mt-1">
                            <MapPin className="w-4 h-4 mr-2 mt-0.5 text-slate-400 flex-shrink-0" />
                            <span>{ref.placement.zone}</span>
                          </div>
                        )}
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
                        placeholder="Emplacement du nouvel objet (facultatif)"
                        className="flex-1 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                      <button
                        onClick={() => { onAddOccurrence(ref.id, draft); setDraftLocations(prev => ({ ...prev, [ref.id]: '' })); }}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-teal-600 text-white hover:bg-teal-500 whitespace-nowrap"
                      >
                        <PlusCircle className="w-4 h-4" /> Ajouter un objet trouvé
                      </button>
                    </div>
                  </li>
                );
              })}
              {orphanOccurrences.length > 0 && (
                <li className="bg-amber-50/60 dark:bg-amber-900/10">
                  <div className="p-6 pb-3">
                    <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                      Objets liés à une référence archivée ({orphanOccurrences.length})
                    </h3>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      Leur référence n'est plus active dans le Référentiel — ces objets restent affichés et conservent leur historique, mais ne comptent plus dans le patrimoine actuel.
                    </p>
                  </div>
                  <ul className="divide-y divide-gray-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                    {orphanOccurrences.map(occ => renderOccurrence(occ, 'référence archivée'))}
                  </ul>
                </li>
              )}
            </ul>
          </>
        )}
      </AuditFormLayout>
      {viewingPhoto && (
        <PhotoViewerModal
          isOpen={!!viewingPhoto}
          onClose={() => setViewingPhoto(null)}
          photo={viewingPhoto}
          onRotate={(newRotation) => {
            onPhotoRotationChange(viewingPhoto.id, newRotation);
            setViewingPhoto(prev => prev ? { ...prev, photo_rotation: newRotation } : null);
          }}
          onNoteChange={(newNote) => {
            onPhotoNoteChange(viewingPhoto.id, newNote);
            setViewingPhoto(prev => prev ? { ...prev, photo_note: newNote } : null);
          }}
        />
      )}
    </>
  );
};

export default CustomAuditForm;

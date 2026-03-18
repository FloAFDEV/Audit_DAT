import React, { useMemo, useState, useRef } from 'react';
import {
  AuditModule,
  Station,
  Direction,
  SignaletiqueData,
  EquipmentStatusType,
  EquipmentStatus
} from '../types';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  Trash2,
  Edit,
  Map as MapIcon,
  Navigation,
  Monitor,
  Layout,
  Maximize2,
  MessageSquare,
  FileText,
  Flag
} from 'lucide-react';
import AuditFormLayout from './AuditFormLayout';
import { showPromiseToast } from './ToastManager';
import PhotoViewerModal from './PhotoViewerModal';

interface SignaletiqueAuditFormProps {
  module: AuditModule;
  station: Station;
  direction: Direction;
  onStatusChange: (category: keyof SignaletiqueData, direction: 'meett' | 'pdj', index: number, status: EquipmentStatusType | 'NotChecked') => void;
  onCommentChange: (category: keyof SignaletiqueData, direction: 'meett' | 'pdj', index: number, comment: string) => void;
  onPhotoChange: (category: keyof SignaletiqueData, direction: 'meett' | 'pdj', index: number, photo_base64: string | null) => void;
  onFieldChange: (category: keyof SignaletiqueData, direction: 'meett' | 'pdj', index: number, field: string, value: any) => void;
  onReset: () => void;
  onStationCommentChange: (comment: string) => void;
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
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Impossible d\'obtenir le contexte du canvas.'));
        }
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

const CATEGORY_LABELS: Record<keyof SignaletiqueData, string> = {
  totem: 'Totem',
  biv: 'BIV (Borne Info Voyageur)',
  planReseau: 'Plan du Réseau',
  planQuartier: 'Plan de Quartier',
  hap: 'HAP (Fiche Horaire)'
};

const CATEGORY_ICONS: Record<keyof SignaletiqueData, React.ReactNode> = {
  totem: <Layout className="w-5 h-5" />,
  biv: <Monitor className="w-5 h-5" />,
  planReseau: <Navigation className="w-5 h-5" />,
  planQuartier: <MapIcon className="w-5 h-5" />,
  hap: <FileText className="w-5 h-5" />
};

const TERMINUS_STATIONS = ['Palais de Justice', 'MEETT'];
const TERMINUS_BANDEAU_TEXT = 'Terminus (avec le picto ligne(s)) / Merci de ne pas monter à bord / Les départs se font depuis le quai opposé';
const MULTI_QUAI_STATIONS = ['Arènes', 'Odyssud'];

const SignaletiqueAuditForm: React.FC<SignaletiqueAuditFormProps> = ({
  module,
  station,
  direction,
  onStatusChange,
  onCommentChange,
  onPhotoChange,
  onFieldChange,
  onReset,
  onStationCommentChange,
  onBack
}) => {
  const signaletique = station.signaletique;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currentUploadRef = useRef<{ category: keyof SignaletiqueData, direction: 'meett' | 'pdj', index: number } | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<{ item: EquipmentStatus, category: keyof SignaletiqueData, direction: 'meett' | 'pdj', index: number } | null>(null);

  const directionKey = useMemo(() => {
    const name = direction.name.toLowerCase();
    if (name.includes('meett') || name.includes('aéroport')) return 'meett';
    return 'pdj';
  }, [direction.name]);

  const directionLabel = direction.name.replace(/^Direction\s/i, '');

  const isTerminus = TERMINUS_STATIONS.includes(station.name);

  const progress = useMemo(() => {
    if (!signaletique) return 0;
    let total = 0;
    let checked = 0;

    const categories: (keyof SignaletiqueData)[] = ['totem', 'biv', 'planReseau', 'planQuartier', 'hap'];
    categories.forEach(cat => {
      const items = signaletique[cat]?.[directionKey] ?? [];
      items.forEach(item => {
        total++;
        if (item.status !== 'NotChecked') {
          checked++;
        }
        // Count planQuartier bandeau sub-field
        if (cat === 'planQuartier') {
          const pqItem = item as any;
          total++;
          if (pqItem.bannerDirection !== 'NotChecked') checked++;
        }
        // Count BIV adhesive sub-fields
        if (cat === 'biv') {
          const bivItem = item as any;
          const BIV_ADHESIVE_FIELDS = ['ligneCaisson', 'destinationCaisson', 'attenteMinCaisson', 'dureeApproxCaisson'];
          BIV_ADHESIVE_FIELDS.forEach(field => {
            total++;
            if (bivItem[field] !== undefined && bivItem[field] !== 'NotChecked') checked++;
          });
          if (MULTI_QUAI_STATIONS.includes(station.name)) {
            total++;
            if (bivItem.quaiCaisson !== undefined && bivItem.quaiCaisson !== 'NotChecked') checked++;
          }
        }
      });
    });

    return total === 0 ? 100 : (checked / total) * 100;
  }, [signaletique, directionKey]);

  const handlePhotoUploadClick = (category: keyof SignaletiqueData, direction: 'meett' | 'pdj', index: number) => {
    currentUploadRef.current = { category, direction, index };
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && currentUploadRef.current) {
      const { category, direction, index } = currentUploadRef.current;

      const promise = resizeImage(file, 1024).then(base64 => {
        onPhotoChange(category, direction, index, base64);
      });

      showPromiseToast(
        promise,
        {
          icon: <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-500"></div>,
          title: "Traitement de l'image...",
          message: "Compression en cours.",
        },
        {
          icon: <div className="h-full w-full rounded-full bg-teal-500 flex items-center justify-center"><CheckCircle2 className="h-5 w-5 text-white" /></div>,
          title: "Photo ajoutée",
          message: "L'image a été enregistrée avec succès.",
        },
        {
          icon: <div className="h-full w-full rounded-full bg-red-500 flex items-center justify-center"><XCircle className="h-5 w-5 text-white" /></div>,
          title: "Erreur",
          message: "Impossible de traiter l'image.",
        }
      );
    }
    if (event.target) {
      event.target.value = '';
    }
  };

  if (!signaletique) return null;

  const renderStatusButtons = (
    currentStatus: EquipmentStatusType | 'NotChecked',
    onSelect: (status: EquipmentStatusType | 'NotChecked') => void,
    options: { value: EquipmentStatusType; label: string; icon: React.ReactNode; colorClass: string; activeColorClass: string }[]
  ) => {
    return (
      <div className="flex items-center gap-2 w-full sm:w-auto">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onSelect(currentStatus === opt.value ? 'NotChecked' : opt.value)}
            className={`flex-1 flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-75 active:scale-95 whitespace-nowrap min-w-0 ${
              currentStatus === opt.value ? opt.activeColorClass : opt.colorClass
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>
    );
  };

  const renderSubField = (
    label: string,
    description: string | null,
    currentStatus: EquipmentStatusType | 'NotChecked',
    onChange: (status: EquipmentStatusType | 'NotChecked') => void
  ) => {
    const okOpt = { value: EquipmentStatusType.OK, label: 'OK', icon: <CheckCircle2 className="w-4 h-4 mr-1.5" />, colorClass: 'bg-white text-teal-700 ring-1 ring-inset ring-teal-500 hover:bg-teal-50 dark:bg-slate-700/50 dark:text-teal-300 dark:ring-slate-600', activeColorClass: 'bg-teal-600 text-white shadow-sm dark:bg-teal-500' };
    const absentOpt = { value: EquipmentStatusType.ABSENT, label: 'Absent', icon: <XCircle className="w-4 h-4 mr-1.5" />, colorClass: 'bg-white text-red-700 ring-1 ring-inset ring-red-600 hover:bg-red-50 dark:bg-slate-700/50 dark:text-red-300 dark:ring-slate-600', activeColorClass: 'bg-red-600 text-white shadow-sm dark:bg-red-500' };
    const toReplaceOpt = { value: EquipmentStatusType.TO_REPLACE, label: 'À remplacer', icon: <AlertTriangle className="w-4 h-4 mr-1.5" />, colorClass: 'bg-white text-orange-600 ring-1 ring-inset ring-orange-500 hover:bg-orange-50 dark:bg-slate-700/50 dark:text-orange-300 dark:ring-slate-600', activeColorClass: 'bg-orange-500 text-white shadow-sm' };
    const subOptions = [okOpt, absentOpt, toReplaceOpt];

    return (
      <div className="mt-3 pt-3 border-t border-dashed border-gray-200 dark:border-slate-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Flag className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-slate-300">{label}</p>
              {description && (
                <p className="text-xs text-gray-500 dark:text-slate-400 italic">{description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            {subOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => onChange(currentStatus === opt.value ? 'NotChecked' : opt.value)}
                className={`flex-1 flex items-center justify-center px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-75 active:scale-95 whitespace-nowrap min-w-0 ${currentStatus === opt.value ? opt.activeColorClass : opt.colorClass}`}
              >
                {opt.icon}{opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderItem = (category: keyof SignaletiqueData, dir: 'meett' | 'pdj', index: number, item: any) => {
    const baseLabel = CATEGORY_LABELS[category];
    const itemName = `${baseLabel} ${signaletique[category][dir].length > 1 ? `#${index + 1}` : ''}`;

    const okOption = { value: EquipmentStatusType.OK, label: 'OK', icon: <CheckCircle2 className="w-5 h-5 mr-2" />, colorClass: 'bg-white text-teal-700 ring-1 ring-inset ring-teal-500 hover:bg-teal-50 dark:bg-slate-700/50 dark:text-teal-300 dark:ring-slate-600 dark:hover:bg-slate-700', activeColorClass: 'bg-teal-600 text-white shadow-sm dark:bg-teal-500' };
    const degradedOption = { value: EquipmentStatusType.DEGRADED, label: 'Dégradé', icon: <AlertTriangle className="w-5 h-5 mr-2" />, colorClass: 'bg-white text-amber-600 ring-1 ring-inset ring-amber-500 hover:bg-amber-50 dark:bg-slate-700/50 dark:text-amber-300 dark:ring-slate-600 dark:hover:bg-slate-700', activeColorClass: 'bg-amber-500 text-white shadow-sm' };
    const hsOption = { value: EquipmentStatusType.HS, label: 'HS', icon: <XCircle className="w-5 h-5 mr-2" />, colorClass: 'bg-white text-red-700 ring-1 ring-inset ring-red-600 hover:bg-red-50 dark:bg-slate-700/50 dark:text-red-300 dark:ring-slate-600 dark:hover:bg-slate-700', activeColorClass: 'bg-red-600 text-white shadow-sm dark:bg-red-500' };
    const absentOption = { value: EquipmentStatusType.ABSENT, label: 'Absent', icon: <XCircle className="w-5 h-5 mr-2" />, colorClass: 'bg-white text-red-700 ring-1 ring-inset ring-red-600 hover:bg-red-50 dark:bg-slate-700/50 dark:text-red-300 dark:ring-slate-600 dark:hover:bg-slate-700', activeColorClass: 'bg-red-600 text-white shadow-sm dark:bg-red-500' };
    const toReplaceOption = { value: EquipmentStatusType.TO_REPLACE, label: 'À remplacer', icon: <AlertTriangle className="w-5 h-5 mr-2" />, colorClass: 'bg-white text-orange-600 ring-1 ring-inset ring-orange-500 hover:bg-orange-50 dark:bg-slate-700/50 dark:text-orange-300 dark:ring-slate-600 dark:hover:bg-slate-700', activeColorClass: 'bg-orange-500 text-white shadow-sm' };

    let options = [okOption, absentOption, toReplaceOption];
    if (category === 'totem') {
      options = [okOption, degradedOption];
    } else if (category === 'biv') {
      options = [okOption, degradedOption, hsOption];
    }

    return (
      <div key={`${category}-${dir}-${index}`} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-gray-100 dark:border-slate-700 last:border-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
               <h3 className="text-lg font-medium text-gray-900 dark:text-slate-100">
                {itemName}
              </h3>
              {item.dimensions && (
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-700 text-[10px] font-medium text-gray-500 dark:text-slate-400 rounded uppercase tracking-wider">
                  {item.dimensions}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400">Vérification de l'état général</p>
          </div>

          <div className="w-full sm:w-auto sm:flex-shrink-0">
            {renderStatusButtons(item.status, (status: any) => onStatusChange(category, dir, index, status), options)}
          </div>
        </div>

        {/* Sous-champ Bandeau pour Plan de Quartier */}
        {category === 'planQuartier' && renderSubField(
          isTerminus ? 'Bandeau Terminus' : 'Bandeau Direction',
          isTerminus ? TERMINUS_BANDEAU_TEXT : null,
          item.bannerDirection,
          (status) => onFieldChange('planQuartier', dir, index, 'bannerDirection', status)
        )}

        {/* Adhésifs IV sur le caisson pour BIV */}
        {category === 'biv' && <>
          {renderSubField('Ligne', '6,7 × 2 cm', (item as any).ligneCaisson ?? 'NotChecked', (status) => onFieldChange('biv', dir, index, 'ligneCaisson', status))}
          {renderSubField('Destination', '15,2 × 2 cm', (item as any).destinationCaisson ?? 'NotChecked', (status) => onFieldChange('biv', dir, index, 'destinationCaisson', status))}
          {renderSubField('Attente en min', '18,2 × 2 cm', (item as any).attenteMinCaisson ?? 'NotChecked', (status) => onFieldChange('biv', dir, index, 'attenteMinCaisson', status))}
          {renderSubField('Durée approximative', '22,4 × 1,5 cm', (item as any).dureeApproxCaisson ?? 'NotChecked', (status) => onFieldChange('biv', dir, index, 'dureeApproxCaisson', status))}
          {MULTI_QUAI_STATIONS.includes(station.name) && renderSubField('Quai (multi-quais)', '6 × 2 cm', (item as any).quaiCaisson ?? 'NotChecked', (status) => onFieldChange('biv', dir, index, 'quaiCaisson', status))}
        </>}

        <div className="mt-4 pt-4 border-t border-dashed border-gray-200 dark:border-slate-700 flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => handlePhotoUploadClick(category, dir, index)}
              className={`flex items-center justify-center p-2 rounded-lg transition-all duration-75 active:scale-95 ${
                item.photo_base64
                  ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:ring-indigo-800'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600'
              }`}
              title={item.photo_base64 ? "Remplacer la photo" : "Ajouter une photo"}
            >
              {item.photo_base64 ? (
                <Edit className="w-5 h-5" />
              ) : (
                <Camera className="w-5 h-5" />
              )}
            </button>

            {item.photo_base64 && (
              <button
                onClick={() => onPhotoChange(category, directionKey, index, null)}
                className="p-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                aria-label="Supprimer la photo"
                title="Supprimer la photo"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}

            <div className="relative flex-1 min-w-[200px]">
              <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={item.comment || ''}
                onChange={(e) => onCommentChange(category, directionKey, index, e.target.value)}
                placeholder="Observation..."
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-gray-700 dark:text-slate-300 transition-all"
              />
            </div>
          </div>

          {item.photo_base64 && (
            <div className="flex items-start gap-4 w-full">
              <button onClick={() => setViewingPhoto({ item, category, direction: directionKey, index })} className="flex-shrink-0 relative group">
                <img
                  src={item.photo_base64}
                  alt="Aperçu"
                  className="w-24 h-24 rounded-md object-cover shadow-sm transition-transform duration-75"
                  style={{ transform: `rotate(${item.photo_rotation || 0}deg)` }}
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
                  <Maximize2 className="w-6 h-6 text-white" />
                </div>
              </button>
              <div className="flex-1">
                {item.photo_note ? (
                  <p className="text-sm text-gray-600 dark:text-slate-300 italic p-3 bg-slate-100 dark:bg-slate-700/50 rounded-md whitespace-pre-wrap">{item.photo_note}</p>
                ) : (
                  <p className="text-sm text-gray-400 dark:text-slate-500 italic">Aucune note pour cette photo.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />
      
      <AuditFormLayout
        module={module}
        title="Équipements Station"
        subtitle={
          <p className="text-gray-600 dark:text-slate-400 text-sm">
            <span className="font-medium text-gray-800 dark:text-slate-200">Station :</span> {station.name} &bull; <span className="font-medium text-gray-800 dark:text-slate-200">Direction :</span> {directionLabel}
          </p>
        }
        progress={progress}
        onBack={onBack}
        onReset={onReset}
        resetConfirmTitle="Réinitialiser les Équipements"
        resetConfirmMessage={`Êtes-vous sûr de vouloir réinitialiser tout l'audit Équipements Station pour la station ${station.name} (${directionLabel}) ?`}
        comment={station.comment}
        onCommentChange={onStationCommentChange}
      >
        <div className="space-y-6 bg-slate-50 dark:bg-slate-900/30">
          {(Object.keys(CATEGORY_LABELS) as (keyof SignaletiqueData)[]).map(category => (
            <div key={category} className="bg-white dark:bg-slate-800 shadow-sm border-b border-gray-200 dark:border-slate-700 overflow-hidden">
              <div className="w-full flex items-center p-6 border-b border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    {CATEGORY_ICONS[category]}
                  </div>
                  <span className="text-lg font-medium text-gray-900 dark:text-slate-100">{CATEGORY_LABELS[category]}</span>
                </div>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-slate-700">
                {(signaletique[category]?.[directionKey] ?? []).map((item, idx) => renderItem(category, directionKey, idx, item))}
              </div>
            </div>
          ))}
        </div>
      </AuditFormLayout>

      {viewingPhoto && (
        <PhotoViewerModal
          isOpen={!!viewingPhoto}
          onClose={() => setViewingPhoto(null)}
          photo={{
            id: `${viewingPhoto.category}-${viewingPhoto.direction}-${viewingPhoto.index}`,
            name: `${CATEGORY_LABELS[viewingPhoto.category]} - ${viewingPhoto.direction === 'meett' ? 'MEETT' : 'PDJ'} #${viewingPhoto.index + 1}`,
            photo_base64: viewingPhoto.item.photo_base64 || '',
            photo_note: viewingPhoto.item.photo_note,
            photo_rotation: viewingPhoto.item.photo_rotation
          }}
        />
      )}
    </>
  );
};

export default SignaletiqueAuditForm;

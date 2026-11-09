import React, { useRef } from 'react';
import { ImagePlus } from 'lucide-react';

// Deux sources pour toute photo d'audit, un seul circuit d'enregistrement
// (le gestionnaire du formulaire : original conservé, SHA-256, copie
// annotée) :
//  - « Prendre une photo » : appareil photo arrière (capture="environment") ;
//  - « Choisir une photo » : photothèque ou fichiers (sans capture).

export type PhotoSource = 'camera' | 'library';

export const usePhotoPicker = () => {
    const cameraRef = useRef<HTMLInputElement | null>(null);
    const libraryRef = useRef<HTMLInputElement | null>(null);
    const open = (source: PhotoSource) => (source === 'camera' ? cameraRef : libraryRef).current?.click();
    return { cameraRef, libraryRef, open };
};

export const PhotoFileInputs: React.FC<{
    picker: ReturnType<typeof usePhotoPicker>;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ picker, onChange }) => (
    <>
        <input type="file" ref={picker.cameraRef} onChange={onChange} accept="image/*" capture="environment" className="hidden" data-photo-source="camera" tabIndex={-1} aria-hidden="true" />
        <input type="file" ref={picker.libraryRef} onChange={onChange} accept="image/*" className="hidden" data-photo-source="library" tabIndex={-1} aria-hidden="true" />
    </>
);

/** Bouton « Choisir une photo » (photothèque / fichiers). `compact` :
 *  icône seule, libellé accessible conservé. */
export const ChoosePhotoButton: React.FC<{ onClick: () => void; hasPhoto?: boolean; compact?: boolean; className?: string }> = ({ onClick, hasPhoto, compact, className }) => {
    const label = hasPhoto ? 'Choisir une autre photo' : 'Choisir une photo';
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            title={`${label} (photothèque ou fichiers)`}
            className={className ?? (compact
                ? 'flex items-center justify-center p-2 rounded-lg bg-white text-teal-700 ring-1 ring-inset ring-teal-500 hover:bg-teal-50 dark:bg-slate-700/50 dark:text-teal-300 dark:ring-slate-600 dark:hover:bg-slate-700 transition-all duration-75 active:scale-95'
                : 'inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md bg-white text-teal-700 ring-1 ring-inset ring-teal-500 hover:bg-teal-50 dark:bg-slate-700/50 dark:text-teal-300 dark:ring-slate-600 dark:hover:bg-slate-700 whitespace-nowrap transition-all duration-75 active:scale-95')}
        >
            <ImagePlus className={compact ? 'w-5 h-5' : 'w-4 h-4'} aria-hidden="true" />
            {!compact && <span>{label}</span>}
        </button>
    );
};

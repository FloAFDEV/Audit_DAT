import React, { useState, useEffect, useRef } from 'react';
import { X, RotateCw, Save, Share2 } from 'lucide-react';
import { db } from '../db';
import { originalFileOf } from '../utils/photos/originalFile';
import { deliverFile, deliveryMessage } from '../utils/photos/deliverFile';

// Forme minimale réellement consommée par ce composant (affichage, rotation,
// note) — volontairement plus étroite que PMRFloorAdhesive pour rester
// utilisable par n'importe quel item photographié de l'app (PMR sol comme
// Signalétique), qui n'ont pas le même vocabulaire de statut.
interface ViewablePhoto {
    photo_base64?: string;
    photo_note?: string;
    photo_rotation?: number;
}

interface PhotoViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    photo: ViewablePhoto;
    onRotate: (newRotation: number) => void;
    onNoteChange: (newNote: string) => void;
    /** Photo en cours dans la table `photos` : son ORIGINAL peut être
     *  enregistré ou partagé (jamais la copie annotée). */
    photoId?: string;
}

/** Original préparé à l'ouverture : sur iOS, le partage doit partir du
 *  clic lui-même, sans lecture asynchrone entre les deux. */
type OriginalState = { kind: 'loading' } | { kind: 'ready'; file: File } | { kind: 'unavailable'; reason: string };

const useOriginalFile = (isOpen: boolean, photoId?: string): OriginalState => {
    const [state, setState] = useState<OriginalState>({ kind: 'loading' });
    useEffect(() => {
        if (!isOpen) return;
        if (!photoId) {
            setState({ kind: 'unavailable', reason: "Original absent de cet appareil (photo importée ou antérieure à la conservation des originaux) : seule la copie annotée existe ici." });
            return;
        }
        let cancelled = false;
        setState({ kind: 'loading' });
        db.photos.get(photoId).then(photo => {
            if (cancelled) return;
            setState(photo
                ? { kind: 'ready', file: originalFileOf(photo) }
                : { kind: 'unavailable', reason: "Original introuvable sur cet appareil (photo prise sur un autre appareil ou restaurée depuis une sauvegarde)." });
        }).catch(() => {
            if (!cancelled) setState({ kind: 'unavailable', reason: "Lecture de l'original impossible (stockage indisponible). Rien n'a été modifié." });
        });
        return () => { cancelled = true; };
    }, [isOpen, photoId]);
    return state;
};

const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({ isOpen, onClose, photo, onRotate, onNoteChange, photoId }) => {
    const [note, setNote] = useState(photo.photo_note || '');
    const original = useOriginalFile(isOpen, photoId);
    const [delivery, setDelivery] = useState<{ busy: boolean; message: string | null }>({ busy: false, message: null });
    useEffect(() => { setDelivery({ busy: false, message: null }); }, [photoId]);

    const handleSaveOriginal = async () => {
        if (original.kind !== 'ready' || delivery.busy) return;
        setDelivery({ busy: true, message: null });
        try {
            const outcome = await deliverFile(original.file, original.file.name);
            setDelivery({ busy: false, message: deliveryMessage(outcome, 'photo') });
        } catch {
            setDelivery({ busy: false, message: "Impossible de transmettre l'original. Rien n'a été modifié." });
        }
    };
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setNote(photo.photo_note || '');
    }, [photo.photo_note]);
    
    useEffect(() => {
        // Auto-resize textarea
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [note]);


    if (!isOpen) return null;

    const handleRotate = () => {
        const currentRotation = photo.photo_rotation || 0;
        const newRotation = (currentRotation + 90) % 360;
        onRotate(newRotation);
    };
    
    const handleSaveNote = () => {
        onNoteChange(note);
        onClose(); // Close modal on save
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-80 transition-opacity z-50 flex flex-col items-center justify-center p-4" 
            aria-labelledby="modal-title" 
            role="dialog" 
            aria-modal="true"
        >
            <div className="absolute top-4 right-4 flex items-center gap-4 z-10">
                 <button
                    onClick={handleRotate}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
                >
                    <RotateCw className="w-5 h-5" />
                    <span>Pivoter</span>
                </button>
                <button
                    onClick={onClose}
                    className="p-3 rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
                    aria-label="Fermer"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>
            
            <div className="relative w-full h-full flex flex-col md:flex-row items-center justify-center gap-8">
                <div className="flex-1 flex items-center justify-center max-h-[60vh] md:max-h-full w-full md:w-auto">
                    <img
                        src={photo.photo_base64}
                        alt="Visualisation de l'adhésif"
                        className="max-w-full max-h-full object-contain rounded-lg shadow-2xl transition-transform duration-300"
                        style={{ transform: `rotate(${photo.photo_rotation || 0}deg)` }}
                    />
                </div>
                
                <div className="w-full md:w-80 flex-shrink-0 bg-slate-800 p-4 rounded-lg flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-white">Note sur la photo</h3>
                    <textarea
                        ref={textareaRef}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Ajouter une note spécifique à cette photo..."
                        className="w-full flex-1 bg-slate-900 text-slate-200 rounded-md p-2 border border-slate-700 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none min-h-[100px]"
                        rows={3}
                    />
                    <section className="border-t border-slate-700 pt-4 flex flex-col gap-2" aria-labelledby="original-title">
                        <h3 id="original-title" className="text-sm font-semibold text-white">Photo originale</h3>
                        <p className="text-xs text-slate-400">Choisir où enregistrer la photo : Photos, Fichiers, Drive… (fichier d'origine, sans le bandeau).</p>
                        <button
                            type="button"
                            onClick={handleSaveOriginal}
                            disabled={original.kind !== 'ready' || delivery.busy}
                            aria-busy={delivery.busy || original.kind === 'loading'}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-white/10 text-white ring-1 ring-inset ring-white/20 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Share2 className="w-5 h-5" aria-hidden="true" />
                            <span>{original.kind === 'loading' ? 'Préparation de l’original…' : 'Enregistrer ou partager l’original'}</span>
                        </button>
                        {original.kind === 'unavailable' && <p className="text-xs text-amber-300" role="status">{original.reason}</p>}
                        {delivery.message && <p className="text-xs text-slate-200" role="status" aria-live="polite" data-testid="original-delivery-message">{delivery.message}</p>}
                    </section>
                     <button
                        onClick={handleSaveNote}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-teal-700 text-white hover:bg-teal-800 transition-colors"
                    >
                        <Save className="w-5 h-5" />
                        <span>Enregistrer et Fermer</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PhotoViewerModal;
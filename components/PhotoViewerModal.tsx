import React, { useState, useEffect, useRef } from 'react';
import { PMRFloorAdhesive } from '../types';
import { X, RotateCw, Save } from 'lucide-react';

interface PhotoViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    photo: PMRFloorAdhesive;
    onRotate: (newRotation: number) => void;
    onNoteChange: (newNote: string) => void;
}

const PhotoViewerModal: React.FC<PhotoViewerModalProps> = ({ isOpen, onClose, photo, onRotate, onNoteChange }) => {
    const [note, setNote] = useState(photo.photo_note || '');
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
                     <button
                        onClick={handleSaveNote}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-teal-600 text-white hover:bg-teal-500 transition-colors"
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
import React from 'react';
import ConfirmationModal from './ConfirmationModal';

// Confirmation avant suppression d'une photo d'audit — même fenêtre pour
// tous les formulaires avec photos (PMR au sol, Équipements Station, plans
// de quartier T1). Pas de code à saisir : action courante sur le terrain,
// et l'original éventuel reste conservé sur l'appareil (table photos).
interface ConfirmPhotoDeleteModalProps {
  /** Élément photographié, null quand la fenêtre est fermée. */
  label: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmPhotoDeleteModal: React.FC<ConfirmPhotoDeleteModalProps> = ({ label, onClose, onConfirm }) => (
  <ConfirmationModal
    isOpen={label !== null}
    onClose={onClose}
    onConfirm={() => { onConfirm(); onClose(); }}
    title="Supprimer la photo ?"
    message={`La photo de « ${label ?? ''} » sera retirée de l'audit.`}
    confirmLabel="Supprimer"
  />
);

export default ConfirmPhotoDeleteModal;

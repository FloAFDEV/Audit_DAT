import React from 'react';
import ConfirmDeleteModal from './ConfirmDeleteModal';

// Confirmation avant suppression d'une photo d'audit — même fenêtre pour
// tous les formulaires avec photos (PMR au sol, Équipements Station, plans
// de quartier T1). Pas de code à saisir : action courante sur le terrain,
// et l'original éventuel reste conservé sur l'appareil (table photos).
interface ConfirmPhotoDeleteModalProps {
  /** Élément photographié, null quand la fenêtre est fermée. */
  label: string | null;
  onClose: () => void;
  onConfirm: () => void | Promise<unknown>;
}

const ConfirmPhotoDeleteModal: React.FC<ConfirmPhotoDeleteModalProps> = ({ label, onClose, onConfirm }) => (
  <ConfirmDeleteModal
    items={label !== null ? [`Photo — ${label}`] : null}
    definitive={false}
    detail="La photo sera retirée de l'audit ; l'original éventuel reste conservé sur l'appareil."
    onCancel={onClose}
    onConfirm={async () => { await onConfirm(); onClose(); }}
  />
);

export default ConfirmPhotoDeleteModal;

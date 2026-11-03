import React from 'react';
import ConfirmationModal from './ConfirmationModal';

// Confirmation commune de TOUTE suppression de données enregistrées :
// titre « Confirmer la suppression », élément(s) concerné(s), caractère
// définitif annoncé seulement s'il est réel, « Annuler » (focus par défaut,
// Échap, clic hors de la fenêtre) et « Supprimer » (destructif). L'action
// peut être asynchrone : la fenêtre reste ouverte et verrouillée pendant
// l'écriture, affiche l'erreur en cas d'échec, et c'est l'appelant qui la
// ferme après succès (jamais d'annonce de réussite sur un échec).
export interface ConfirmDeleteModalProps {
  /** Libellés des éléments à supprimer ; null ou vide = fenêtre fermée. */
  items: string[] | null;
  onCancel: () => void;
  onConfirm: () => void | Promise<unknown>;
  /** Suppression définitive (défaut) ; false = retrait réversible ou
   *  original conservé ailleurs (le message le précise alors). */
  definitive?: boolean;
  /** Précision métier ajoutée au message (ex. « l'original est conservé »). */
  detail?: string;
  /** Code de confirmation à saisir (suppressions à fort impact). */
  requireCode?: boolean;
  icon?: React.ReactNode;
}

/** Message de la fenêtre (exporté pour les tests). */
export const deleteConfirmationMessage = (items: string[], definitive: boolean, detail?: string): string => {
  const head = items.length > 1
    ? `${items.length} éléments seront supprimés :\n${items.map(i => `• ${i}`).join('\n')}`
    : `Élément : ${items[0]}`;
  const tail = definitive ? 'Cette suppression est définitive.' : '';
  return [head, detail, tail].filter(Boolean).join('\n\n');
};

const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({ items, onCancel, onConfirm, definitive = true, detail, requireCode, icon }) => (
  <ConfirmationModal
    isOpen={!!items && items.length > 0}
    onClose={onCancel}
    onConfirm={onConfirm}
    title="Confirmer la suppression"
    message={items && items.length > 0 ? deleteConfirmationMessage(items, definitive, detail) : ''}
    confirmLabel="Supprimer"
    cancelLabel="Annuler"
    isDestructive={requireCode}
    icon={icon}
  />
);

export default ConfirmDeleteModal;

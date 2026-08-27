// data/customAuditIcons.ts
// =================================================================
// Partie 2 — audits configurables : petite palette d'icônes sélectionnables
// en Admin pour une AuditDefinition. Aucun nouveau système graphique — ce
// sont les mêmes icônes lucide-react utilisées partout ailleurs dans
// l'app, simplement adressables par un nom (clé stockée sur la
// définition) plutôt qu'importées en dur par type comme ModuleIcon.tsx.
// =================================================================
import {
    LucideIcon, MapPin, Image, FileText, Megaphone, Camera, Info,
    Compass, Flag, Bookmark, Tag, Layers, ClipboardList, Landmark, Signpost,
} from 'lucide-react';

export const CUSTOM_AUDIT_ICONS: Record<string, LucideIcon> = {
    MapPin, Image, FileText, Megaphone, Camera, Info,
    Compass, Flag, Bookmark, Tag, Layers, ClipboardList, Landmark, Signpost,
};

export const CUSTOM_AUDIT_ICON_KEYS = Object.keys(CUSTOM_AUDIT_ICONS);

export const DEFAULT_CUSTOM_AUDIT_ICON = 'MapPin';

/** Résout une clé d'icône vers son composant — repli sur l'icône par
 *  défaut si la clé est inconnue (jamais un crash d'affichage pour une
 *  icône introuvable, ex. après un import d'un fichier plus ancien). */
export const resolveCustomAuditIcon = (iconKey: string): LucideIcon =>
    CUSTOM_AUDIT_ICONS[iconKey] ?? CUSTOM_AUDIT_ICONS[DEFAULT_CUSTOM_AUDIT_ICON];

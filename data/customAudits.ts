// data/customAudits.ts
// =================================================================
// Audits configurables — définis EN DUR dans le code (choix délibéré :
// pas de création dynamique en Admin, pas de table Dexie dédiée).
// Ajouter un audit = ajouter une entrée ici et redéployer.
//
// Chaque entrée est le PROJET d'audit (identité, nom, icône) — jamais de
// donnée physique ici :
//   - ses références (types d'objets : format/matière/pose) vivent dans
//     signageReferences, scope { auditType: 'CUSTOM', definitionId: id },
//     même table/CRUD/versioning que le reste du référentiel ;
//   - son relevé terrain vit dans AuditModule (type CUSTOM) sur chaque
//     station, comme tout le reste (aucune table séparée).
// L'attache d'un module à une station se fait un par un, à la main,
// depuis la fiche station (StationModulesPanel) — comme ECA/PMR/DAT.
// Aucune propagation réseau, aucun ciblage par ligne : si demain un audit
// doit exister sur une station, on l'y attache, point.
// =================================================================
import { LucideIcon, MapPin } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = { MapPin };

export interface CustomAuditTypeDefinition {
    /** Stable, jamais renommé — c'est la clé de scope.definitionId sur les
     *  références et de CustomAuditData.definitionId sur les modules déjà
     *  matérialisés. Renommer cet id orpheline les données existantes. */
    id: string;
    name: string;
    /** Clé dans ICONS ci-dessus. */
    icon: string;
}

export const CUSTOM_AUDIT_TYPES: CustomAuditTypeDefinition[] = [
    { id: 'plans-de-quartier', name: 'Plans de quartier', icon: 'MapPin' },
    // Demain : { id: 'adhesifs-tarifaires', name: 'Adhésifs tarifaires', icon: '...' },
];

export const getCustomAuditType = (id: string): CustomAuditTypeDefinition | undefined =>
    CUSTOM_AUDIT_TYPES.find(d => d.id === id);

/** Résout une clé d'icône vers son composant — repli sur MapPin si la clé
 *  est inconnue (jamais un crash d'affichage, ex. après un import d'un
 *  fichier plus ancien référençant un audit retiré du registre). */
export const resolveCustomAuditIcon = (iconKey: string): LucideIcon => ICONS[iconKey] ?? MapPin;

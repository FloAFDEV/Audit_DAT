// utils/navigationPersistence.ts
// =================================================================
// REPRISE DE NAVIGATION (Lot 2.4) — persiste la position de navigation
// courante (lieu → module → station/direction/dat, ou zone/équipement
// P+R, ou ECA) pour la restaurer après un rechargement, un crash ou
// une interruption de terrain. Les DONNÉES d'audit sont déjà
// persistées à chaque champ (store.ts::_updateLieu) — ce module ne
// concerne que la POSITION D'ÉCRAN, jusqu'ici perdue à chaque
// rechargement puisque l'état de sélection ne vivait qu'en mémoire
// (Zustand, jamais dans localStorage).
// -----------------------------------------------------------------
// Restauration STRICTEMENT validée contre les données réellement
// chargées : si un maillon de la chaîne sauvegardée ne résout plus
// (lieu supprimé par un import, module absent après un reset...), on
// s'arrête au dernier maillon valide plutôt que de risquer un écran
// incohérent avec des identifiants orphelins.
// =================================================================
import { AuditModuleType, EcaData, Lieu, ModeData, Pr } from '../types';

export const NAV_STORAGE_KEY = 'tisseo-audit-navigation';

export interface NavigationSelection {
    selectedLieuId: string | null;
    selectedModuleId: string | null;
    selectedStationId: string | null;
    selectedDirectionId: string | null;
    selectedDatId: string | null;
    selectedPrZoneId: string | null;
    selectedEquipmentId: string | null;
    selectedEcaId: string | null;
}

export const NAV_KEYS: (keyof NavigationSelection)[] = [
    'selectedLieuId', 'selectedModuleId', 'selectedStationId', 'selectedDirectionId',
    'selectedDatId', 'selectedPrZoneId', 'selectedEquipmentId', 'selectedEcaId',
];

/** Sauvegarde best-effort (localStorage peut être indisponible/plein — sans
 *  impact fonctionnel : la reprise automatique est un confort de navigation,
 *  jamais une donnée métier). Absence de lieu sélectionné → efface l'entrée
 *  (retour à l'accueil, déconnexion : rien à reprendre). */
export const saveNavigationSelection = (selection: NavigationSelection): void => {
    try {
        if (!selection.selectedLieuId) {
            localStorage.removeItem(NAV_STORAGE_KEY);
            return;
        }
        localStorage.setItem(NAV_STORAGE_KEY, JSON.stringify(selection));
    } catch { /* ignore */ }
};

/** Lit la sélection sauvegardée et ne restitue QUE le préfixe de la chaîne
 *  qui résout encore réellement contre `lieux` — jamais un identifiant
 *  orphelin. Retourne {} si rien n'est restaurable (première visite,
 *  entrée absente/corrompue, ou lieu/module qui n'existe plus). */
export const resolveRestoredNavigation = (lieux: Lieu[]): Partial<NavigationSelection> => {
    try {
        const raw = localStorage.getItem(NAV_STORAGE_KEY);
        if (!raw) return {};
        const saved = JSON.parse(raw) as Partial<NavigationSelection> | null;
        if (!saved || typeof saved !== 'object' || !saved.selectedLieuId) return {};

        const lieu = lieux.find(l => l.id === saved.selectedLieuId);
        if (!lieu) return {};
        const result: Partial<NavigationSelection> = { selectedLieuId: lieu.id };

        const module = lieu.modules.find(m => m.id === saved.selectedModuleId);
        if (!module) return result;
        result.selectedModuleId = module.id;

        if (module.type === AuditModuleType.DAT || module.type === AuditModuleType.SIGNALETIQUE) {
            const modeData = module.data as ModeData;
            const station = modeData.stations?.find(s => s.id === saved.selectedStationId);
            if (!station) return result;
            result.selectedStationId = station.id;

            const direction = station.directions?.find(d => d.id === saved.selectedDirectionId);
            if (!direction) return result;
            result.selectedDirectionId = direction.id;

            if (module.type === AuditModuleType.DAT) {
                const dat = direction.dats?.find(d => d.id === saved.selectedDatId);
                if (dat) result.selectedDatId = dat.id;
            }
        } else if (module.type === AuditModuleType.PR) {
            const prData = module.data as Pr;
            const zone = prData.zones?.find(z => z.id === saved.selectedPrZoneId);
            if (!zone) return result;
            result.selectedPrZoneId = zone.id;

            const equipment = zone.equipments?.find(e => e.id === saved.selectedEquipmentId);
            if (equipment) result.selectedEquipmentId = equipment.id;
        } else if (module.type === AuditModuleType.ECA) {
            const ecaData = module.data as EcaData;
            const eca = ecaData.ecas?.find(e => e.id === saved.selectedEcaId);
            if (eca) result.selectedEcaId = eca.id;
        }

        return result;
    } catch {
        return {};
    }
};

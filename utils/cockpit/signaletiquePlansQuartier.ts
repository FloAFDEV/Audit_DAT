// utils/cockpit/signaletiquePlansQuartier.ts
// =================================================================
// Plans de quartier audités dans Équipements Station (arrêts T1, et
// Aéroport Express à sa mise en service) — LECTURE SEULE pour le cockpit.
// Chaque plan reste dans son module d'origine : rien n'est copié, déplacé
// ni créé. Même périmètre et même règle de défaut que l'index Équipements
// Station (utils/cockpit/signaletiqueStationIndex.ts) : modules en
// exploitation actuelle uniquement, « non installé » ignoré. Le même
// critère (isModuleInCurrentScope) est appliqué à la station du registre :
// les modules Aéroport Express sont ouverts à la préparation alors que la
// ligne n'est pas en service (Station.isFuture) — leurs plans entreront ici
// à la mise en service, sans autre changement.
// Différence de périmètre VOLONTAIRE : l'index « Anomalies Équipements
// Station » garde son comportement (module seul) et peut donc inclure des
// modules préparatoires comme l'Aéroport Express — non harmonisé ici.
// Un exemplaire
// par plan physique et par direction ; dimension propre au module (jamais
// assimilée à une autre ligne).
// =================================================================
import { AuditModuleType, EquipmentStatusType, Lieu } from '../../types';
import { readStationEquipmentModule } from './stationEquipmentReader';
import { isModuleInCurrentScope } from '../moduleScope';
import { isDefect } from './signaletiqueStationIndex';
import { dirKeyOf } from '../signaletiqueDirections';

export interface SignaletiquePlanQuartier {
    lieuName: string;
    line: string;
    stationName: string;
    /** Direction réelle de la station (station.directions), même règle que le
     *  formulaire ; undefined si la station n'a pas de direction pour cet
     *  emplacement (jamais un libellé inventé). */
    direction?: string;
    /** Dimension portée par l'exemplaire (ex. « 83 x 100 cm »). */
    dimensions: string;
    isDefect: boolean;
}

export const collectSignaletiquePlansQuartier = (lieux: Lieu[]): SignaletiquePlanQuartier[] => {
    const plans: SignaletiquePlanQuartier[] = [];
    for (const lieu of lieux) {
        for (const module of lieu.modules) {
            if (module.type !== AuditModuleType.SIGNALETIQUE || !isModuleInCurrentScope(module)) continue;
            const line = module.line || '?';
            // Parcours unique (utils/cockpit/stationEquipmentReader.ts).
            for (const { station, stationInService, kind, position, holder } of readStationEquipmentModule(lieu, module)) {
                if (kind !== 'planQuartier' || !stationInService) continue;
                const status = (holder.status ?? 'NotChecked') as EquipmentStatusType | 'NotChecked';
                if (status === EquipmentStatusType.NOT_APPLICABLE) continue;
                plans.push({
                    lieuName: lieu.name, line, stationName: station.name,
                    direction: station.directions?.find(d => dirKeyOf(d.name) === position)?.name,
                    dimensions: holder.dimensions ?? '',
                    isDefect: isDefect(status),
                });
            }
        }
    }
    return plans;
};

/** Recensement des plans Équipements Station — total et défauts propres.
 *  Ces plans n'existent qu'ici (aucune occurrence Plans de quartier ne les
 *  duplique) : le cockpit les ajoute UNE fois au total Plans de quartier. */
export const summarizeSignaletiqueCensus = (plans: SignaletiquePlanQuartier[]): { total: number; defects: number } => ({
    total: plans.length,
    defects: plans.filter(p => p.isDefect).length,
});

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
import { AuditModuleType, EquipmentStatusType, Lieu, ModeData } from '../../types';
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
            for (const station of (module.data as ModeData).stations ?? []) {
                const sig = station.signaletique;
                if (!sig || !isModuleInCurrentScope(station)) continue;
                (['meett', 'pdj'] as const).forEach(dir => {
                    const direction = station.directions?.find(d => dirKeyOf(d.name) === dir)?.name;
                    for (const p of sig.planQuartier?.[dir] ?? []) {
                        const status = p.status ?? 'NotChecked';
                        if (status === EquipmentStatusType.NOT_APPLICABLE) continue;
                        plans.push({
                            lieuName: lieu.name, line, stationName: station.name,
                            direction,
                            dimensions: p.dimensions ?? '',
                            isDefect: isDefect(status),
                        });
                    }
                });
            }
        }
    }
    return plans;
};

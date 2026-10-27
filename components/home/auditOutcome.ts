// components/home/auditOutcome.ts
// Le parcours de démonstration (Arènes, ligne A, Salle des billets, DAT 01)
// et ce qu'il produit, calculé par le MOTEUR DE L'APP — partagé par la démo
// interactive et les compositions promotionnelles, pour que les deux disent
// exactement la même chose. Lecture seule : référentiel du seed pur, objets
// en mémoire ; ni store ni Dexie.
import { useMemo } from 'react';
import { ADHESIVES, getDatAdhesivesForLine } from '../../data/adhesives';
import { createInitialAdhesiveStatus } from '../../data/builder';
import { buildSignageReferencesSeed } from '../../data/signage_seed';
import { getReferenceVisualUrl } from '../../data/referenceVisuals';
import { buildPatrimoineIndex } from '../../utils/cockpit/patrimoineIndex';
import { buildMaintenanceActions } from '../../utils/cockpit/maintenanceActions';
import { LINE_TO_CATEGORY } from '../../utils/cockpit/signaletiqueStationIndex';
import {
    Adhesive, AdhesiveStatus, AuditModule, AuditModuleType, DAT, Direction, Lieu, MaintenanceItem, Station, TransportMode,
} from '../../types';

export const DEMO_LINE = 'A' as const;
export const DEMO_ADHESIVES = getDatAdhesivesForLine(ADHESIVES, DEMO_LINE);

/** Repère présenté dans le récit : libellés et visuel réels, découpés comme le formulaire de l'app. */
export interface RepereInfo {
    id: string;
    number: string;
    title: string;
    dimensions?: string;
    location?: string;
    visual?: string;
}

export const repereInfo = (adhesive: Adhesive): RepereInfo => {
    const [, number = adhesive.name, title = ''] = adhesive.name.match(/^(Repère \d+)\s*-\s*(.*)$/) ?? [];
    const parts = (adhesive.description ?? '').split('|');
    return {
        id: adhesive.id,
        number,
        title: title || adhesive.name,
        dimensions: parts.length > 1 ? parts[0].replace('Dimensions:', '').trim() : undefined,
        location: (parts.length > 1 ? parts.slice(1).join('|') : parts[0]).replace('Localisation:', '').trim() || undefined,
        visual: getReferenceVisualUrl(adhesive.id),
    };
};

/** DAT dont tous les repères sont « OK » sauf ceux précisés (index → statut). */
export const datWith = (overrides: Record<number, AdhesiveStatus>, base: AdhesiveStatus = AdhesiveStatus.OK): DAT => {
    const adhesives = createInitialAdhesiveStatus(DEMO_ADHESIVES);
    DEMO_ADHESIVES.forEach((a, i) => { adhesives[a.id] = overrides[i] ?? base; });
    return { id: 'demo-dat-01', name: 'DAT 01', adhesives, comment: '' };
};

/** Le contrôle raconté par la page (celui des captures) : repère 6 à remplacer, repère 9 absent. */
export const STORY_DAT = datWith({ 5: AdhesiveStatus.ToBeReplaced, 8: AdhesiveStatus.Absent });

export const useAuditOutcome = (dat: DAT) => {
    const signageReferences = useMemo(buildSignageReferencesSeed, []);

    const context = useMemo(() => {
        const direction: Direction = { id: 'demo-direction', name: 'Salle des billets', dats: [dat] };
        const station: Station = { id: 'demo-station', name: 'Arènes', code: 'ARE', directions: [direction] };
        const module: AuditModule = {
            id: 'demo-module',
            type: AuditModuleType.DAT,
            name: 'DAT',
            line: DEMO_LINE,
            data: { id: 'demo-mode', name: 'Métro A', type: TransportMode.METRO, line: DEMO_LINE, stations: [station] },
        };
        const lieu: Lieu = { id: 'demo-lieu', name: 'Arènes', modules: [module] };
        return { lieu, direction, station, module };
    }, [dat]);

    // Le moteur du cockpit, sur ce seul DAT.
    const index = useMemo(() => buildPatrimoineIndex([context.lieu], signageReferences), [context.lieu, signageReferences]);
    const actions = useMemo(() => buildMaintenanceActions(index, signageReferences, 'reference'), [index, signageReferences]);
    // Même projection que la liste plate de l'Analyse des anomalies (AnomaliesView).
    const interventionItems = useMemo<MaintenanceItem[]>(() => {
        const refById = new Map(signageReferences.map((r) => [r.id, r]));
        return index.implantations
            .filter((imp) => imp.status === AdhesiveStatus.Absent || imp.status === AdhesiveStatus.ToBeReplaced)
            .map((imp) => ({
                lieuName: imp.lieuName,
                moduleName: imp.moduleName,
                elementName: imp.equipmentLabel,
                context: imp.context,
                adhesiveName: refById.get(imp.referenceId)?.name ?? imp.referenceId,
                status: imp.status,
                category: LINE_TO_CATEGORY[imp.line],
                auditType: refById.get(imp.referenceId)?.auditType as AuditModuleType | undefined,
            }));
    }, [index, signageReferences]);

    const statuses = DEMO_ADHESIVES.map((a) => dat.adhesives[a.id]);
    const counts = {
        total: DEMO_ADHESIVES.length,
        checked: statuses.filter((s) => s !== undefined && s !== AdhesiveStatus.NotChecked).length,
        absent: statuses.filter((s) => s === AdhesiveStatus.Absent).length,
        toReplace: statuses.filter((s) => s === AdhesiveStatus.ToBeReplaced).length,
    };

    return { signageReferences, ...context, actions, interventionItems, counts };
};

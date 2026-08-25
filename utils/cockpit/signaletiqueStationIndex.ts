// utils/cockpit/signaletiqueStationIndex.ts
// =================================================================
// MOTEUR D'INDEX — ÉQUIPEMENTS STATION (référentiel autonome).
// -----------------------------------------------------------------
// Contrat de plateforme, règle 7 : ce référentiel n'a pas de catalogue
// signageReferences (pas de DAT/PR/ECA) — il obtient sa propre instance
// du même principe de calcul patrimonial (parcourir le scope, agréger
// en usage/totaux), adaptée à son modèle propre : SignaletiqueData
// (totem / BIV / plan réseau / plan quartier / HAP / bandeau station),
// statuts EquipmentStatusType. Jamais fusionné avec patrimoineIndex
// (Signalétique IV) ni avec generateMaintenanceSummary (PMR sol /
// Pictogrammes cognitifs) — référentiel distinct, source distincte,
// jamais un total commun.
//
// Mapping des statuts (validé avec l'exploitant, ne pas réinterpréter) :
//   OK              -> conforme
//   'NotChecked'    -> non contrôlé
//   NOT_APPLICABLE  -> exclu (non installé à cet emplacement — jamais
//                      réellement produit par le formulaire actuel,
//                      traité par cohérence avec les autres référentiels)
//   ABSENT          -> anomalie « Absent »
//   TO_REPLACE      -> anomalie « À remplacer »
//   DEGRADED        -> anomalie « À remplacer » (pas de palier
//                      intermédiaire dans le modèle Cockpit existant)
//   HS              -> anomalie « HS », compteur distinct (un BIV est
//                      une borne d'information voyageur : un HS reste
//                      un HS, jamais réinterprété en Absent ou À
//                      remplacer)
// =================================================================
import { Lieu, AuditModuleType, ModeData, EquipmentStatusType, MaintenanceItem, AuditCategory } from '../../types';
import { isModuleInAuditScope } from '../moduleScope';

// Ligne -> catégorie : même correspondance que getCategoryForModule
// (utils/maintenanceGenerator.ts) / LINE_TO_CATEGORY (AnomaliesView.tsx),
// pour que la colonne "Ligne" de l'export CSV reste renseignée.
const LINE_TO_CATEGORY: Record<string, AuditCategory> = {
    'A': 'METRO_A', 'B': 'METRO_B', 'C': 'METRO_C',
    'TRAM': 'TRAM', 'TELEO': 'TELEO', 'AEROPORT': 'AEROPORT', 'P+R': 'PR',
};

export interface SignaletiqueStationItemRef {
    lieuId: string;
    lieuName: string;
    line: string;
    moduleId: string;
    moduleName: string;
    /** Famille d'équipement : Totem, BIV, Plan Réseau, Plan Quartier, HAP, Bandeau Station. */
    category: string;
    /** Point de contrôle précis (ex. "Totem — Odyssud (direction1)"). */
    label: string;
    status: EquipmentStatusType | 'NotChecked';
    /** Photo du relevé terrain sur l'équipement porteur de ce statut (ex.
     *  le Totem, le BIV) — absente pour les champs qui n'en capturent pas
     *  eux-mêmes (ex. sous-statuts comme « adhésifs blancs »), auquel cas
     *  la photo de l'équipement porteur est reprise (même point de
     *  contrôle physique, une seule photo). */
    photo_base64?: string | null;
    photo_rotation?: number;
}

export interface SignaletiqueStationTotals {
    implantationCount: number;
    okCount: number;
    absentCount: number;
    toReplaceCount: number;
    hsCount: number;
    /** absentCount + toReplaceCount + hsCount. */
    defectCount: number;
    uncheckedCount: number;
}

export interface SignaletiqueStationIndex {
    items: SignaletiqueStationItemRef[];
    totals: SignaletiqueStationTotals;
}

const CATEGORY_LABELS = {
    totem: 'Totem',
    biv: 'BIV',
    planReseau: 'Plan Réseau',
    planQuartier: 'Plan Quartier',
    hap: 'HAP',
    bandeauStation: 'Bandeau Station',
} as const;

const DIRECTIONS = ['direction1', 'direction2'] as const;
const SIGN_DIRS = ['meett', 'pdj'] as const;

export const buildSignaletiqueStationIndex = (lieux: Lieu[]): SignaletiqueStationIndex => {
    const items: SignaletiqueStationItemRef[] = [];

    const push = (
        base: Omit<SignaletiqueStationItemRef, 'status' | 'photo_base64' | 'photo_rotation'>,
        status: EquipmentStatusType | 'NotChecked' | undefined,
        photoSource?: { photo_base64?: string | null; photo_rotation?: number },
    ) => {
        const resolved = status ?? 'NotChecked';
        // Non installé à cet emplacement — jamais réellement produit par le
        // formulaire actuel, mais traité par cohérence (même convention que
        // AdhesiveStatus.NotApplicable ailleurs dans le cockpit).
        if (resolved === EquipmentStatusType.NOT_APPLICABLE) return;
        items.push({
            ...base,
            status: resolved,
            photo_base64: photoSource?.photo_base64,
            photo_rotation: photoSource?.photo_rotation,
        });
    };

    for (const lieu of lieux) {
        for (const module of lieu.modules) {
            // Même convention d'inclusion que patrimoineIndex/useStats : les
            // modules "futurs" C et AEROPORT restent auditables donc comptés
            // (cf. utils/moduleScope.ts).
            if (!isModuleInAuditScope(module)) continue;
            if (module.type !== AuditModuleType.SIGNALETIQUE) continue;

            const base = {
                lieuId: lieu.id, lieuName: lieu.name, line: module.line || '?',
                moduleId: module.id, moduleName: module.name,
            };

            for (const station of (module.data as ModeData).stations ?? []) {
                const sig = station.signaletique;
                if (!sig) continue;

                DIRECTIONS.forEach(dir => {
                    const t = sig.totem?.[dir];
                    if (t) push({ ...base, category: CATEGORY_LABELS.totem, label: `Totem — ${station.name} (${dir})` }, t.status, t);

                    const bd = sig.bandeauStation?.[dir];
                    if (bd) {
                        const label = `Bandeau Station — ${station.name} (${dir})`;
                        push({ ...base, category: CATEGORY_LABELS.bandeauStation, label }, bd.status, bd);
                        push({ ...base, category: CATEGORY_LABELS.bandeauStation, label: `${label} · contenu direction` }, bd.directionContent, bd);
                        push({ ...base, category: CATEGORY_LABELS.bandeauStation, label: `${label} · nom station` }, bd.stationNameContent, bd);
                    }
                });

                SIGN_DIRS.forEach(dir => {
                    (sig.biv?.[dir] ?? []).forEach((b, i) => {
                        const label = `BIV ${dir} #${i + 1} — ${station.name}`;
                        push({ ...base, category: CATEGORY_LABELS.biv, label }, b.status, b);
                        push({ ...base, category: CATEGORY_LABELS.biv, label: `${label} · fonctionnement écran` }, b.screenFunctioning, b);
                        push({ ...base, category: CATEGORY_LABELS.biv, label: `${label} · adhésifs blancs` }, b.whiteTextAdhesives, b);
                        push({ ...base, category: CATEGORY_LABELS.biv, label: `${label} · ligne caisson` }, b.ligneCaisson, b);
                        push({ ...base, category: CATEGORY_LABELS.biv, label: `${label} · destination caisson` }, b.destinationCaisson, b);
                        push({ ...base, category: CATEGORY_LABELS.biv, label: `${label} · attente min. caisson` }, b.attenteMinCaisson, b);
                        push({ ...base, category: CATEGORY_LABELS.biv, label: `${label} · durée approx. caisson` }, b.dureeApproxCaisson, b);
                        push({ ...base, category: CATEGORY_LABELS.biv, label: `${label} · quai caisson` }, b.quaiCaisson, b);
                    });

                    (sig.planReseau?.[dir] ?? []).forEach((p, i) => {
                        const label = `Plan Réseau ${dir} #${i + 1} — ${station.name}`;
                        push({ ...base, category: CATEGORY_LABELS.planReseau, label }, p.status, p);
                        push({ ...base, category: CATEGORY_LABELS.planReseau, label: `${label} · nom station bannière` }, p.bannerStationName, p);
                        push({ ...base, category: CATEGORY_LABELS.planReseau, label: `${label} · HAP` }, p.hap, p);
                    });

                    (sig.planQuartier?.[dir] ?? []).forEach((p, i) => {
                        const label = `Plan Quartier ${dir} #${i + 1} — ${station.name}`;
                        push({ ...base, category: CATEGORY_LABELS.planQuartier, label }, p.status, p);
                        push({ ...base, category: CATEGORY_LABELS.planQuartier, label: `${label} · direction bannière` }, p.bannerDirection, p);
                        push({ ...base, category: CATEGORY_LABELS.planQuartier, label: `${label} · HAP` }, p.hap, p);
                    });

                    (sig.hap?.[dir] ?? []).forEach((h, i) => {
                        push({ ...base, category: CATEGORY_LABELS.hap, label: `HAP ${dir} #${i + 1} — ${station.name}` }, h.status, h);
                    });
                });
            }
        }
    }

    const totals: SignaletiqueStationTotals = {
        implantationCount: items.length, okCount: 0, absentCount: 0, toReplaceCount: 0,
        hsCount: 0, defectCount: 0, uncheckedCount: 0,
    };

    for (const item of items) {
        switch (item.status) {
            case EquipmentStatusType.OK: totals.okCount++; break;
            case EquipmentStatusType.ABSENT: totals.absentCount++; break;
            case EquipmentStatusType.TO_REPLACE: totals.toReplaceCount++; break;
            case EquipmentStatusType.DEGRADED: totals.toReplaceCount++; break; // validé : Dégradé -> À remplacer
            case EquipmentStatusType.HS: totals.hsCount++; break; // validé : HS reste HS, jamais réinterprété
            default: totals.uncheckedCount++; break; // 'NotChecked'
        }
    }
    totals.defectCount = totals.absentCount + totals.toReplaceCount + totals.hsCount;

    return { items, totals };
};

const isDefect = (status: EquipmentStatusType | 'NotChecked') => (
    status === EquipmentStatusType.ABSENT
    || status === EquipmentStatusType.TO_REPLACE
    || status === EquipmentStatusType.DEGRADED
    || status === EquipmentStatusType.HS
);

/** Adaptateur vers MaintenanceItem, pour réutiliser MaintenanceListModal/
 *  exportMaintenanceListToCsv tels quels (même contrat que les autres
 *  référentiels, aucune nouvelle structure d'export). */
export const signaletiqueStationDefectsToMaintenanceItems = (items: SignaletiqueStationItemRef[]): MaintenanceItem[] => (
    items.filter(i => isDefect(i.status)).map(i => ({
        lieuName: i.lieuName,
        moduleName: i.moduleName,
        elementName: i.label,
        context: i.category,
        adhesiveName: i.category,
        // HS conserve son libellé propre (validé) ; Dégradé rejoint À
        // remplacer (pas de palier intermédiaire dans MaintenanceListModal).
        status: i.status === EquipmentStatusType.ABSENT ? 'Absent'
            : i.status === EquipmentStatusType.HS ? 'HS'
            : 'ToBeReplaced',
        category: LINE_TO_CATEGORY[i.line],
        auditType: AuditModuleType.SIGNALETIQUE,
        photo_base64: i.photo_base64,
        photo_rotation: i.photo_rotation,
    }))
);

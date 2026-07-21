// utils/cockpit/networkIndex.ts
// =================================================================
// MOTEUR D'INDEX RÉSEAU — cœur de calcul du cockpit métier.
// =================================================================
// CONTRAT DE PLATEFORME (opposable à toute évolution future) :
//
//  1. UNE SEULE SOURCE DE CALCUL — toute donnée agrégée du cockpit
//     (usage d'une référence, défauts, compteurs de synthèse, futurs
//     regroupements de campagne/commande) provient de buildNetworkIndex.
//     Interdiction de re-parcourir l'arbre d'audit dans une vue.
//     Si le cockpit sait qu'une référence est présente 427 fois, la
//     maintenance, le référentiel, la synthèse et les futures commandes
//     lisent exactement cette même donnée. Aucun recalcul parallèle.
//
//  2. UNE SEULE FICHE — toute référence, cliquée depuis n'importe quelle
//     section, ouvre la même fiche de vie (ReferenceSheet).
//
//  3. DES SECTIONS, PAS DES PAGES — une nouvelle capacité = une nouvelle
//     section de fiche ou un nouveau mode de regroupement Maintenance,
//     jamais une page indépendante.
//
//  4. SÉLECTION → ACTION — toute fonctionnalité future (campagne,
//     intervention, commande) est une action branchée sur une Selection
//     (ensemble d'implantations) produite par les vues existantes.
//
//  5. LE RÉFÉRENTIEL NE CONNAÎT PAS LES FOURNISSEURS — le cockpit
//     travaille avec la référence métier, jamais avec une ligne de marché.
//
// R10 : ce moteur est le PREMIER lecteur conforme — la liste des
// implantations dérive du scope des références (signageReferences),
// jamais des maps de statuts ; la map adhesives{} ne fournit que les
// statuts saisis (clé absente = Non contrôlé).
//
// Périmètre : familles référencées (DAT / PR / ECA). Les familles hors
// référentiel (PMR sol, pictos cognitifs, signalétique station) restent
// servies par maintenanceGenerator jusqu'à leur éventuelle entrée au
// référentiel — trajectoire connue, pas un oubli.
//
// Échelle : un parcours O(n) unique, mémoïsé par l'appelant (useNetworkIndex).
// Aucune hypothèse sur le nombre de références, de familles ou de lignes :
// tout est piloté par les données (scope, arbre d'audit).
// =================================================================

import {
    Lieu, AuditModuleType, ModeData, Pr, EcaData, AdhesiveStatus,
    SignageReference,
} from '../../types';

// -----------------------------------------------------------------
// Types du contrat (stables : les vues dépendent d'eux, pas de l'arbre)
// -----------------------------------------------------------------

/** Une implantation = un exemplaire d'une référence sur un équipement précis. */
export interface ImplantationRef {
    referenceId: string;
    lieuId: string;
    lieuName: string;
    /** Ligne de transport (A/B/C/TRAM/TELEO/AEROPORT) ou 'P+R'. */
    line: string;
    moduleId: string;
    moduleName: string;
    /** Contexte physique : direction, zone P+R, point d'accès ECA. */
    context: string;
    /** "DAT 02", "BS01", "Valideur 3"... */
    equipmentLabel: string;
    equipmentType?: string;
    /** Statut constaté ; clé absente de la map = NotChecked (R10). */
    status: AdhesiveStatus;
}

/** Réponse à « où cette référence est-elle utilisée ? ». */
export interface ReferenceUsage {
    referenceId: string;
    installedCount: number;
    okCount: number;
    absentCount: number;
    toReplaceCount: number;
    uncheckedCount: number;
    /** absentCount + toReplaceCount. */
    defectCount: number;
    lieuCount: number;
    lines: string[];
    equipmentTypes: string[];
    byLieu: { lieuId: string; lieuName: string; installed: number; defects: number }[];
}

export interface NetworkTotals {
    implantationCount: number;
    okCount: number;
    defectCount: number;
    absentCount: number;
    toReplaceCount: number;
    uncheckedCount: number;
    /** Nombre de références distinctes réellement présentes sur le terrain. */
    referencesInstalledCount: number;
}

export interface NetworkIndex {
    implantations: ImplantationRef[];
    byReference: Map<string, ReferenceUsage>;
    totals: NetworkTotals;
}

/**
 * Une sélection = la prise sur laquelle se brancheront les futures actions
 * (préparer une intervention, générer un document, ouvrir une campagne).
 * Aujourd'hui la seule action est l'affichage ; le type existe pour que
 * les vues soient productrices de sélections dès leur naissance.
 */
export interface Selection {
    label: string;
    items: ImplantationRef[];
}

// -----------------------------------------------------------------
// Résolveur (R10) : quelles références s'appliquent à un équipement ?
// -----------------------------------------------------------------

export const resolveReferencesForEquipment = (
    references: SignageReference[],
    auditType: 'DAT' | 'PR' | 'ECA',
    equipmentType?: string,
    surchargeIds?: string[],
): SignageReference[] => {
    let list = references.filter(ref => {
        if (ref.isDisabled) return false;
        if (ref.scope.auditType !== auditType) return false;
        const scopeTypes = (ref.scope as { equipmentTypes?: string[] }).equipmentTypes;
        // equipmentTypes absent = toute la famille ; présent = liste blanche.
        if (scopeTypes && equipmentType && !scopeTypes.includes(equipmentType)) return false;
        return true;
    });
    // Surcharge locale (equipment.adhesiveIds) : liste blanche restrictive,
    // sémantique identique au mécanisme P+R historique.
    if (surchargeIds) list = list.filter(ref => surchargeIds.includes(ref.id));
    return list;
};

// -----------------------------------------------------------------
// Construction de l'index — LE parcours unique de l'arbre d'audit
// -----------------------------------------------------------------

const isDefect = (s: AdhesiveStatus) => s === AdhesiveStatus.Absent || s === AdhesiveStatus.ToBeReplaced;

export const buildNetworkIndex = (lieux: Lieu[], references: SignageReference[]): NetworkIndex => {
    const implantations: ImplantationRef[] = [];

    const pushImplantations = (
        refs: SignageReference[],
        statuses: { [key: string]: AdhesiveStatus },
        base: Omit<ImplantationRef, 'referenceId' | 'status'>,
    ) => {
        for (const ref of refs) {
            const status = statuses[ref.id] ?? AdhesiveStatus.NotChecked; // R10
            // NotApplicable = non installé à cet emplacement (préréglages
            // par station des pictos PMR ECA, cas particuliers terrain).
            if (status === AdhesiveStatus.NotApplicable) continue;
            implantations.push({ ...base, referenceId: ref.id, status });
        }
    };

    for (const lieu of lieux) {
        for (const module of lieu.modules) {
            // Convention d'inclusion identique à useStats : les modules
            // "futurs" C et AEROPORT restent auditables donc comptés.
            if (module.isFuture && module.line !== 'C' && module.line !== 'AEROPORT') continue;

            switch (module.type) {
                case AuditModuleType.DAT: {
                    const refs = resolveReferencesForEquipment(references, 'DAT');
                    for (const station of (module.data as ModeData).stations ?? []) {
                        for (const direction of station.directions ?? []) {
                            for (const dat of direction.dats ?? []) {
                                pushImplantations(refs, dat.adhesives ?? {}, {
                                    lieuId: lieu.id, lieuName: lieu.name,
                                    line: module.line || '?',
                                    moduleId: module.id, moduleName: module.name,
                                    context: direction.name,
                                    equipmentLabel: dat.name,
                                });
                            }
                        }
                    }
                    break;
                }
                case AuditModuleType.PR: {
                    for (const zone of (module.data as Pr).zones ?? []) {
                        for (const equip of zone.equipments ?? []) {
                            const refs = resolveReferencesForEquipment(references, 'PR', equip.type, equip.adhesiveIds);
                            pushImplantations(refs, equip.adhesives ?? {}, {
                                lieuId: lieu.id, lieuName: lieu.name,
                                line: 'P+R',
                                moduleId: module.id, moduleName: module.name,
                                context: zone.name,
                                equipmentLabel: equip.name,
                                equipmentType: equip.type,
                            });
                        }
                    }
                    break;
                }
                case AuditModuleType.ECA: {
                    for (const eca of (module.data as EcaData).ecas ?? []) {
                        if (eca.isNotApplicable) continue;
                        const refs = resolveReferencesForEquipment(references, 'ECA', eca.type);
                        pushImplantations(refs, eca.adhesives ?? {}, {
                            lieuId: lieu.id, lieuName: lieu.name,
                            line: module.line || '?',
                            moduleId: module.id, moduleName: module.name,
                            context: eca.accessPoint,
                            equipmentLabel: eca.name,
                            equipmentType: eca.type,
                        });
                    }
                    break;
                }
                // PMR sol / pictos / signalétique : hors référentiel (cf. en-tête).
            }
        }
    }

    // --- Agrégation : une seule passe sur les implantations ---
    const byReference = new Map<string, ReferenceUsage>();
    const byRefLieu = new Map<string, Map<string, { lieuId: string; lieuName: string; installed: number; defects: number }>>();
    const totals: NetworkTotals = {
        implantationCount: 0, okCount: 0, defectCount: 0,
        absentCount: 0, toReplaceCount: 0, uncheckedCount: 0,
        referencesInstalledCount: 0,
    };

    for (const imp of implantations) {
        let usage = byReference.get(imp.referenceId);
        if (!usage) {
            usage = {
                referenceId: imp.referenceId,
                installedCount: 0, okCount: 0, absentCount: 0, toReplaceCount: 0,
                uncheckedCount: 0, defectCount: 0, lieuCount: 0,
                lines: [], equipmentTypes: [], byLieu: [],
            };
            byReference.set(imp.referenceId, usage);
            byRefLieu.set(imp.referenceId, new Map());
        }

        usage.installedCount++;
        totals.implantationCount++;

        if (imp.status === AdhesiveStatus.OK) { usage.okCount++; totals.okCount++; }
        else if (imp.status === AdhesiveStatus.Absent) { usage.absentCount++; totals.absentCount++; }
        else if (imp.status === AdhesiveStatus.ToBeReplaced) { usage.toReplaceCount++; totals.toReplaceCount++; }
        else { usage.uncheckedCount++; totals.uncheckedCount++; }

        if (!usage.lines.includes(imp.line)) usage.lines.push(imp.line);
        if (imp.equipmentType && !usage.equipmentTypes.includes(imp.equipmentType)) usage.equipmentTypes.push(imp.equipmentType);

        const lieuMap = byRefLieu.get(imp.referenceId)!;
        let lieuEntry = lieuMap.get(imp.lieuId);
        if (!lieuEntry) {
            lieuEntry = { lieuId: imp.lieuId, lieuName: imp.lieuName, installed: 0, defects: 0 };
            lieuMap.set(imp.lieuId, lieuEntry);
        }
        lieuEntry.installed++;
        if (isDefect(imp.status)) lieuEntry.defects++;
    }

    byReference.forEach((usage, refId) => {
        usage.defectCount = usage.absentCount + usage.toReplaceCount;
        usage.byLieu = Array.from(byRefLieu.get(refId)!.values())
            .sort((a, b) => b.defects - a.defects || b.installed - a.installed);
        usage.lieuCount = usage.byLieu.length;
    });

    totals.defectCount = totals.absentCount + totals.toReplaceCount;
    totals.referencesInstalledCount = byReference.size;

    return { implantations, byReference, totals };
};

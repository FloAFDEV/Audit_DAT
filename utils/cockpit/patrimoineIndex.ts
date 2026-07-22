// utils/cockpit/patrimoineIndex.ts
// =================================================================
// MOTEUR D'INDEX DU PATRIMOINE — cœur de calcul du cockpit métier.
// =================================================================
// Le cockpit ne pense pas « référentiel » : il pense PATRIMOINE.
// Le référentiel signalétique n'est qu'un des composants du patrimoine.
// Aujourd'hui ce moteur indexe la signalétique référencée (DAT/PR/ECA) ;
// demain il indexera d'autres familles (autres signalétiques, puis le
// patrimoine élargi) et alimentera campagnes, maintenance, commandes,
// statistiques, stocks et interventions — le cockpit reste, les modules
// s'y branchent.
//
// CONTRAT DE PLATEFORME (opposable à toute évolution future) :
//
//  1. UNE SEULE SOURCE DE CALCUL — toute donnée agrégée du cockpit
//     (usage d'une référence, défauts, compteurs, regroupements par
//     support/matière/ligne, futures campagnes/commandes) provient de
//     buildPatrimoineIndex. Interdiction de re-parcourir l'arbre d'audit
//     dans une vue. Si le cockpit sait qu'une référence est présente
//     427 fois, toutes les vues lisent exactement cette même donnée.
//     Aucun recalcul parallèle. Aucune divergence.
//
//  2. UNE SEULE FICHE — toute référence, cliquée depuis n'importe quelle
//     section, ouvre la même fiche de vie (ReferenceSheet).
//
//  3. DES SECTIONS, PAS DES PAGES — une nouvelle capacité = une nouvelle
//     section de fiche ou un nouveau mode de regroupement, jamais une
//     page indépendante.
//
//  4. SÉLECTION → ACTION — toute fonctionnalité future (campagne,
//     intervention, commande) est une action branchée sur une Selection
//     (ensemble d'implantations) produite par les vues existantes.
//
//  5. LE PATRIMOINE NE CONNAÎT PAS LES FOURNISSEURS — le cockpit
//     travaille avec la référence métier, jamais avec une ligne de marché.
//
//  6. TROIS MÉMOIRES, JAMAIS CONFONDUES — le cockpit distingue trois
//     natures de données, chacune avec un rôle et un seul :
//
//     RÉFÉRENTIEL — source de vérité du patrimoine ACTUEL (catalogue +
//     implantations telles que connues aujourd'hui). Répond à
//     « qu'avons-nous, où, en quelle quantité ? ». Pas de dimension
//     temporelle : c'est un état, pas une trajectoire.
//
//     AUDIT — constat terrain de l'état PRÉSENT, comparé au Référentiel.
//     Répond à « qu'est-ce qui diverge, là, maintenant ? ».
//     Le modèle courant conserve uniquement le dernier état connu.
//     La conservation chronologique des évolutions relève exclusivement
//     du Journal d'événements.
//
//     JOURNAL D'ÉVÉNEMENTS (à construire) — mémoire CHRONOLOGIQUE des
//     changements observés sur une implantation (statut avant/après,
//     date, identité de l'implantation). Seule structure de tout le
//     cockpit dont la raison d'être est de se souvenir du passé.
//     Représente des événements MÉTIER, pas des événements techniques :
//     une modification de stockage, une migration ou une synchronisation
//     ne constitue jamais un événement patrimoine. Seuls les changements
//     observés ou validés sur une implantation appartiennent à cette
//     mémoire.
//
//     Aucune des trois ne peut jouer le rôle d'une autre. Un principe
//     qui répond à une question temporelle ne doit jamais être construit
//     en creusant le Référentiel ou l'Audit — il doit s'appuyer sur le
//     Journal, quand celui-ci existera.
//
//     Archives (existant, périmètre actuel conservé) reste dédié aux
//     snapshots d'état pris lors des remises à zéro d'audit — une photo
//     ponctuelle et globale, pas un flux d'événements. Archives ne
//     devient pas le Journal d'événements, mais pourra naturellement
//     accueillir demain des vues ou analyses alimentées par ce Journal
//     (vieillissement, récurrence, cycle de vie).
//
//     patrimoineIndex reste un moteur de LECTURE DÉRIVÉ : il recalcule
//     l'état courant à chaque appel, à partir de l'arbre d'audit vivant.
//     Il ne doit jamais être détourné pour porter une notion d'historique,
//     de tendance ou de récurrence.
//
//     Le contexte historique n'est jamais une priorité : un calcul de
//     récurrence est une information de contexte, affichée à côté d'une
//     anomalie — il ne modifie jamais sa qualification, sa bande
//     d'urgence ni son tri. Même principe que maintenancePriority :
//     affiché, jamais décideur.
//
// R10 : ce moteur est le PREMIER lecteur conforme — la liste des
// implantations dérive du scope des références (signageReferences),
// jamais des maps de statuts ; la map adhesives{} ne fournit que les
// statuts saisis (clé absente = Non contrôlé).
//
// Périmètre actuel : familles référencées (DAT / PR / ECA). Les familles
// hors référentiel (PMR sol, pictos cognitifs, signalétique station)
// restent servies par maintenanceGenerator jusqu'à leur entrée au
// patrimoine — trajectoire connue, pas un oubli.
//
// Échelle : un parcours O(n) unique, mémoïsé par l'appelant
// (usePatrimoineIndex). Aucune hypothèse sur le nombre de références,
// de familles, de lignes ou de supports : tout est piloté par les données.
// =================================================================

import {
    Lieu, AuditModuleType, ModeData, Pr, EcaData, AdhesiveStatus,
    SignageReference, SignageSupport,
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
    /** Répartition par ligne — « combien sur la ligne B ? » sans re-parcourir l'arbre. */
    byLine: { line: string; installed: number; defects: number }[];
}

/** Compteurs de statut pour un regroupement (support, ligne, demain matière/commune...). */
export interface GroupStatusCounts {
    installed: number;
    ok: number;
    defects: number;
    unchecked: number;
}

export interface PatrimoineTotals {
    implantationCount: number;
    okCount: number;
    defectCount: number;
    absentCount: number;
    toReplaceCount: number;
    uncheckedCount: number;
    /** Nombre de références distinctes réellement présentes sur le terrain. */
    referencesInstalledCount: number;
}

export interface PatrimoineIndex {
    implantations: ImplantationRef[];
    byReference: Map<string, ReferenceUsage>;
    /** « Combien de Dibond ? de PVC ? de vitrophanies ? » — par support physique. */
    bySupport: Map<SignageSupport, GroupStatusCounts>;
    /** « Combien par ligne ? » — A/B/C/TRAM/TELEO/AEROPORT/P+R. */
    byLine: Map<string, GroupStatusCounts>;
    totals: PatrimoineTotals;
}

// Le type Selection (objet métier transversal, contrat "sélection → action")
// vit désormais dans ./selection.ts — pas ici, pour qu'aucun module ne
// puisse se l'approprier comme une notion propriétaire.

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

export const buildPatrimoineIndex = (lieux: Lieu[], references: SignageReference[]): PatrimoineIndex => {
    const implantations: ImplantationRef[] = [];
    const refById = new Map(references.map(r => [r.id, r]));

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
                // PMR sol / pictos / signalétique : hors patrimoine référencé (cf. en-tête).
            }
        }
    }

    // --- Agrégation : une seule passe sur les implantations ---
    const byReference = new Map<string, ReferenceUsage>();
    const byRefLieu = new Map<string, Map<string, { lieuId: string; lieuName: string; installed: number; defects: number }>>();
    const byRefLine = new Map<string, Map<string, { line: string; installed: number; defects: number }>>();
    const bySupport = new Map<SignageSupport, GroupStatusCounts>();
    const byLine = new Map<string, GroupStatusCounts>();
    const totals: PatrimoineTotals = {
        implantationCount: 0, okCount: 0, defectCount: 0,
        absentCount: 0, toReplaceCount: 0, uncheckedCount: 0,
        referencesInstalledCount: 0,
    };

    const bumpGroup = <K,>(map: Map<K, GroupStatusCounts>, key: K, status: AdhesiveStatus) => {
        let entry = map.get(key);
        if (!entry) {
            entry = { installed: 0, ok: 0, defects: 0, unchecked: 0 };
            map.set(key, entry);
        }
        entry.installed++;
        if (status === AdhesiveStatus.OK) entry.ok++;
        else if (isDefect(status)) entry.defects++;
        else entry.unchecked++;
    };

    for (const imp of implantations) {
        let usage = byReference.get(imp.referenceId);
        if (!usage) {
            usage = {
                referenceId: imp.referenceId,
                installedCount: 0, okCount: 0, absentCount: 0, toReplaceCount: 0,
                uncheckedCount: 0, defectCount: 0, lieuCount: 0,
                lines: [], equipmentTypes: [], byLieu: [], byLine: [],
            };
            byReference.set(imp.referenceId, usage);
            byRefLieu.set(imp.referenceId, new Map());
            byRefLine.set(imp.referenceId, new Map());
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

        const lineMap = byRefLine.get(imp.referenceId)!;
        let lineEntry = lineMap.get(imp.line);
        if (!lineEntry) {
            lineEntry = { line: imp.line, installed: 0, defects: 0 };
            lineMap.set(imp.line, lineEntry);
        }
        lineEntry.installed++;
        if (isDefect(imp.status)) lineEntry.defects++;

        // Dimensions patrimoine : support (via la fiche référence) et ligne.
        // D'autres axes (matière, commune, marché...) s'ajouteront ici sans
        // toucher aux vues existantes — même passe, nouvelle Map.
        const ref = refById.get(imp.referenceId);
        if (ref) bumpGroup(bySupport, ref.support, imp.status);
        bumpGroup(byLine, imp.line, imp.status);
    }

    byReference.forEach((usage, refId) => {
        usage.defectCount = usage.absentCount + usage.toReplaceCount;
        usage.byLieu = Array.from(byRefLieu.get(refId)!.values())
            .sort((a, b) => b.defects - a.defects || b.installed - a.installed);
        usage.lieuCount = usage.byLieu.length;
        usage.byLine = Array.from(byRefLine.get(refId)!.values())
            .sort((a, b) => b.installed - a.installed);
    });

    totals.defectCount = totals.absentCount + totals.toReplaceCount;
    totals.referencesInstalledCount = byReference.size;

    return { implantations, byReference, bySupport, byLine, totals };
};

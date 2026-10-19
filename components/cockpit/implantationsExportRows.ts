// components/cockpit/implantationsExportRows.ts
// =================================================================
// Lignes d'export d'un ensemble d'implantations — SOURCE UNIQUE de
// l'export Excel (onglets par ligne + Synthèse) et du CSV de pose : même
// sélection, mêmes éléments, même ordre (lignes dans l'ordre métier,
// stations dans l'ordre physique), mêmes quantités. Aucun second calcul :
// on ne fait que présenter des ImplantationRef déjà produites par le
// moteur d'index (utils/cockpit/patrimoineIndex.ts).
// Vit dans components/cockpit (et non utils/) parce qu'il s'appuie sur
// les libellés de présentation de ./labels.
// =================================================================
import { SignageReference } from '../../types';
import { ImplantationRef, PatrimoineIndex } from '../../utils/cockpit/patrimoineIndex';
import { sortByPhysicalStationOrder } from '../../utils/cockpit/exportStationOrder';
import { ImplantationExportRow, SyntheseExportRow } from '../../utils/cockpit/implantationsExporter';
import { PoseRow, poseVisualPath } from '../../utils/cockpit/poseExport';
import { CognitivePictogramPoseItem } from '../../utils/cockpit/cognitivePictogramSummary';
import { getReferenceVisualUrl } from '../../data/referenceVisuals';
import { getCognitivePictogramVisualUrl } from '../../data/cognitivePictogramVisuals';
import {
    compareLines, displayReferenceName, exportZoneLabel, fieldDesignation, formatDimensions, validatorTypeLabel,
} from './labels';

export interface ImplantationLineSheet {
    line: string;
    sheetName: string;
    /** Implantations de la ligne, dans l'ordre des lignes de `rows`. */
    items: ImplantationRef[];
    rows: ImplantationExportRow[];
}

/** Onglets « Ligne X » de l'export Excel (une ligne = une occurrence). */
export const buildImplantationLineSheets = (
    items: ImplantationRef[],
    refById: Map<string, SignageReference>,
): ImplantationLineSheet[] => {
    const lines = [...new Set(items.map(i => i.line))].sort(compareLines);
    return lines.map(line => {
        // Stations dans leur ordre physique sur la ligne (export uniquement).
        const lineItems = sortByPhysicalStationOrder(line, items.filter(i => i.line === line), i => i.lieuName);
        return {
            line,
            sheetName: line === 'P+R' ? 'P+R' : `Ligne ${line}`,
            items: lineItems,
            rows: lineItems.map((imp): ImplantationExportRow => {
                const ref = refById.get(imp.referenceId);
                return {
                    station: imp.lieuName,
                    context: imp.context,
                    equipment: imp.equipmentLabel,
                    validatorType: validatorTypeLabel(imp.equipmentType),
                    reference: imp.referenceId,
                    designation: ref ? fieldDesignation(ref) : imp.referenceId,
                    catalogDesignation: ref ? displayReferenceName(ref) : imp.referenceId,
                    zoneLabel: exportZoneLabel(imp.equipmentType, imp.zone),
                    dimensions: ref ? formatDimensions(ref.dimensions) : '',
                    quantity: 1,
                };
            }),
        };
    });
};

/** Onglet « Synthèse » de l'export Excel : quantité par référence et par
 *  ligne, limitée aux lignes présentes dans les implantations exportées. */
export const buildImplantationSyntheseRows = (
    items: ImplantationRef[],
    index: PatrimoineIndex,
    refById: Map<string, SignageReference>,
): SyntheseExportRow[] => {
    const syntheseRows: SyntheseExportRow[] = [];
    const lines = new Set(items.map(i => i.line));
    const referenceIds = [...new Set(items.map(i => i.referenceId))];
    for (const refId of referenceIds) {
        const usage = index.byReference.get(refId);
        const ref = refById.get(refId);
        if (!usage || !ref) continue;
        for (const lineEntry of usage.byLine) {
            if (!lines.has(lineEntry.line)) continue;
            syntheseRows.push({
                reference: refId,
                designation: fieldDesignation(ref),
                catalogDesignation: displayReferenceName(ref),
                dimensions: formatDimensions(ref.dimensions),
                line: lineEntry.line,
                count: lineEntry.installed,
            });
        }
    }
    return syntheseRows.sort((a, b) => a.reference.localeCompare(b.reference) || compareLines(a.line, b.line));
};

const FAMILY_LABELS: Record<SignageReference['auditType'], string> = {
    DAT: 'Signalétique IV — DAT',
    PR: 'Signalétique IV — P+R',
    ECA: 'Signalétique IV — ECA',
    PDQ: 'Plan de quartier',
};

export const COGNITIVE_POSE_FAMILY = 'Pictogramme cognitif';

/** Lignes du CSV de pose : les implantations dans l'ordre exact des onglets
 *  Excel, puis — ligne par ligne — les pictogrammes cognitifs dans l'ordre
 *  physique des stations. Quantité 1 par ligne. */
export const buildPoseRows = (
    sheets: ImplantationLineSheet[],
    refById: Map<string, SignageReference>,
    cognitive: CognitivePictogramPoseItem[] = [],
): PoseRow[] => {
    const implantationRowsByLine = new Map<string, PoseRow[]>();
    for (const sheet of sheets) {
        implantationRowsByLine.set(sheet.line, sheet.items.map((imp, i) => {
            const row = sheet.rows[i];
            const ref = refById.get(imp.referenceId);
            return {
                line: sheet.line,
                station: row.station,
                family: ref ? FAMILY_LABELS[ref.auditType] : '',
                equipment: row.equipment,
                location: row.context,
                zone: row.zoneLabel,
                reference: row.reference,
                designation: row.designation,
                dimensions: row.dimensions,
                quantity: 1,
                visual: poseVisualPath(getReferenceVisualUrl(imp.referenceId)),
            };
        }));
    }
    const lines = [...new Set([...sheets.map(s => s.line), ...cognitive.map(c => c.line)])].sort(compareLines);
    return lines.flatMap(line => [
        ...(implantationRowsByLine.get(line) ?? []),
        ...sortByPhysicalStationOrder(line, cognitive.filter(c => c.line === line), c => c.lieuName)
            .map((c): PoseRow => ({
                line,
                station: c.lieuName,
                family: COGNITIVE_POSE_FAMILY,
                equipment: '',
                location: c.accessPointName,
                zone: '',
                reference: '',
                designation: COGNITIVE_POSE_FAMILY,
                dimensions: c.dimensions,
                quantity: 1,
                visual: poseVisualPath(getCognitivePictogramVisualUrl(c.stationCode)),
            })),
    ]);
};

// components/cockpit/FamilyElementSheet.tsx
// Fiche d'un élément hors catalogue (PMR au sol par matière, pictogramme
// cognitif par dimension) — même grammaire que la fiche référence
// (ReferenceSheet) : en-tête et volumétrie, caractéristiques réellement
// connues, implantations ligne → station → accès, CSV de pose (format
// inchangé). Lecture seule.
import React, { useMemo } from 'react';
import { ArrowLeft, Ruler, Radar } from 'lucide-react';
import { SignageReference } from '../../types';
import { FamilyElement, ELEMENT_FAMILY_LABELS } from '../../utils/cockpit/familyElements';
import { PmrFloorPoseItem } from '../../utils/cockpit/pmrFloorPose';
import { CognitivePictogramPoseItem } from '../../utils/cockpit/cognitivePictogramSummary';
import { buildPoseRows } from './implantationsExportRows';
import { PoseCsvExportButton } from './ImplantationsTree';
import { PoseRowsTree } from './PoseRowsTree';
import { SheetSection, Field } from './ReferenceSheet';
import { compareLines, formatDimensionText } from './labels';
import { ReferenceVisual } from '../ReferenceVisual';
import { CognitivePictogramVisual } from '../CognitivePictogramVisual';
import { countLineBExtension, LINE_B_EXTENSION } from '../../data/lineBExtension';

interface FamilyElementSheetProps {
    element: FamilyElement;
    pmrFloor: PmrFloorPoseItem[];
    cognitive: CognitivePictogramPoseItem[];
    refById: Map<string, SignageReference>;
    onBack: () => void;
}

const FamilyElementSheet: React.FC<FamilyElementSheetProps> = ({ element, pmrFloor, cognitive, refById, onBack }) => {
    const rows = useMemo(() => buildPoseRows([], refById, cognitive, pmrFloor), [refById, cognitive, pmrFloor]);
    const stationCodeOf = useMemo(() => new Map(cognitive.map(c => [`${c.line}|${c.lieuName}`, c.stationCode])), [cognitive]);
    const lineBExtensionCount = countLineBExtension([...pmrFloor, ...cognitive]);
    const lines = [...element.lines].sort(compareLines).map(l => (l === 'P+R' ? l : `Ligne ${l}`)).join(', ');

    return (
        <div className="space-y-5">
            <div className="flex items-start gap-3">
                <button
                    onClick={onBack}
                    className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors flex-shrink-0"
                    aria-label="Retour à la liste"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                {element.family === 'PMR'
                    ? <ReferenceVisual referenceId="pmr-sol" label={element.name} size="lg" />
                    : <CognitivePictogramVisual stationCode={cognitive[0]?.stationCode} stationName={cognitive[0]?.lieuName} />}
                <div className="min-w-0 flex-1">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-slate-100 break-words">{element.name}</h2>
                    <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-sm">
                        <span className="text-lg font-bold text-teal-700 dark:text-teal-400 tabular-nums">{element.quantity}</span>
                        <span className="text-slate-600 dark:text-slate-300">emplacement{element.quantity > 1 ? 's' : ''} référencé{element.quantity > 1 ? 's' : ''}</span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="text-lg font-bold text-teal-700 dark:text-teal-400 tabular-nums">{element.lieuCount}</span>
                        <span className="text-slate-600 dark:text-slate-300">lieu{element.lieuCount > 1 ? 'x' : ''}</span>
                    </p>
                    {/* Extension B : comptée selon les règles actuelles, pose non
                        confirmée avant la mise en service. */}
                    {lineBExtensionCount > 0 && (
                        <p className="mt-1 text-xs text-sky-800 dark:text-sky-300">
                            Dont {lineBExtensionCount} sur l'{LINE_B_EXTENSION.label.charAt(0).toLowerCase() + LINE_B_EXTENSION.label.slice(1)} ({LINE_B_EXTENSION.commissioning}) : référencé{lineBExtensionCount > 1 ? 's' : ''}, pose non confirmée.
                        </p>
                    )}
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{ELEMENT_FAMILY_LABELS[element.family]} · hors catalogue</p>
                </div>
            </div>

            <SheetSection title="Caractéristiques" icon={<Ruler className="w-4 h-4" />}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Dimensions" value={formatDimensionText(element.dimensions)} />
                    <Field label="Matière" value={element.material} />
                    <Field label="Lignes" value={lines} />
                </div>
            </SheetSection>

            <SheetSection title="Implantations sur le réseau" icon={<Radar className="w-4 h-4" />}>
                {rows.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic">Aucune implantation sur le périmètre actuel.</p>
                ) : (
                    <>
                        <div className="flex flex-col gap-2 mb-3 sm:flex-row sm:justify-end *:w-full *:justify-center sm:*:w-auto">
                            <PoseCsvExportButton items={[]} refById={refById} cognitive={cognitive} pmrFloor={pmrFloor} />
                        </div>
                        <PoseRowsTree
                            rows={rows}
                            renderVisual={element.family === 'COG'
                                ? row => <CognitivePictogramVisual stationCode={stationCodeOf.get(`${row.line}|${row.station}`)} stationName={row.station} size="sm" field zoomable />
                                : undefined}
                            visualKey={element.family === 'COG' ? row => stationCodeOf.get(`${row.line}|${row.station}`) : undefined}
                        />
                    </>
                )}
            </SheetSection>
        </div>
    );
};

export default FamilyElementSheet;

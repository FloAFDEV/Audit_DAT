// components/home/HomeNetworkScale.tsx
// Échelle du périmètre suivi — chiffres CALCULÉS, jamais saisis : le
// référentiel initial de l'application (generateInitialLieuxDataAsync, celui
// d'une première installation) passé au hook du cockpit (useStats). Si le
// référentiel évolue, ces chiffres suivent. Lecture seule : ni store, ni Dexie.
import React, { useEffect, useMemo, useState } from 'react';
import { generateInitialLieuxDataAsync } from '../../data/builder';
import { useStats } from '../../hooks/useStats';
import type { Lieu, SignageReference } from '../../types';

const NO_REFERENCES: SignageReference[] = [];

const HomeNetworkScale: React.FC = () => {
    const [lieux, setLieux] = useState<Lieu[]>([]);
    useEffect(() => {
        let alive = true;
        generateInitialLieuxDataAsync().then((l) => alive && setLieux(l)).catch(() => undefined);
        return () => { alive = false; };
    }, []);
    const { globalCounts } = useStats(lieux, NO_REFERENCES);

    const figures = useMemo(() => [
        { value: globalCounts.stationCountTotal, label: 'stations' },
        { value: globalCounts.datCount, label: 'distributeurs (DAT)' },
        { value: globalCounts.ecaCount, label: 'valideurs (ECA)' },
        { value: globalCounts.prCount, label: 'parcs relais' },
    ], [globalCounts]);

    const ready = lieux.length > 0;

    return (
        <div className="mx-auto mt-10 max-w-4xl px-5 sm:px-8">
            <p className="text-center text-xs font-medium uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Périmètre suivi dans AuditRef
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 dark:border-slate-800 dark:bg-slate-800 sm:grid-cols-4">
                {figures.map(({ value, label }) => (
                    <div key={label} className="flex flex-col-reverse items-center bg-white px-4 py-5 text-center dark:bg-slate-950">
                        <dt className="mt-1 text-xs text-slate-600 dark:text-slate-400">{label}</dt>
                        <dd className="text-3xl font-bold tabular-nums text-slate-900 dark:text-white">{ready ? value : '—'}</dd>
                    </div>
                ))}
            </dl>
            <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
                Chaque équipement porte ses propres repères à contrôler.
            </p>
        </div>
    );
};

export default HomeNetworkScale;

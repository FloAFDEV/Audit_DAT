// components/home/HomeNetworkScale.tsx
// Échelle du périmètre suivi — chiffres CALCULÉS, jamais saisis : le
// référentiel initial de l'application (generateInitialLieuxDataAsync, celui
// d'une première installation) passé au hook du cockpit (useStats). Si le
// référentiel évolue, ces chiffres suivent. Lecture seule : ni store, ni Dexie.
import { useEffect, useMemo, useState } from 'react';
import { generateInitialLieuxDataAsync } from '../../data/builder';
import { useStats } from '../../hooks/useStats';
import type { Lieu, SignageReference } from '../../types';

const NO_REFERENCES: SignageReference[] = [];

/** Référentiel initial de l'application (celui d'une première installation), en lecture seule. */
export const useInitialLieux = (): Lieu[] => {
    const [lieux, setLieux] = useState<Lieu[]>([]);
    useEffect(() => {
        let alive = true;
        generateInitialLieuxDataAsync().then((l) => alive && setLieux(l)).catch(() => undefined);
        return () => { alive = false; };
    }, []);
    return lieux;
};

/** Périmètre suivi, calculé par le hook du cockpit (useStats). */
export const useNetworkFigures = () => {
    const lieux = useInitialLieux();
    const { globalCounts } = useStats(lieux, NO_REFERENCES);
    const figures = useMemo(() => [
        { value: globalCounts.stationCountTotal, label: 'stations' },
        { value: globalCounts.datCount, label: 'distributeurs (DAT)' },
        { value: globalCounts.ecaCount, label: 'valideurs (ECA)' },
        { value: globalCounts.prCount, label: 'parcs relais' },
    ], [globalCounts]);
    return { lieux, figures, ready: lieux.length > 0 };
};

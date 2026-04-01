import { Station } from '../types';
import {
    REGISTRY_LINE_A,
    REGISTRY_LINE_B,
    REGISTRY_LINE_C,
    REGISTRY_TRAM_T1,
    REGISTRY_TELEO,
    REGISTRY_AEROPORT_EXPRESS,
    REGISTRY_INTERCHANGE_HUBS,
    ACTIVE_LINES,
    StationDef,
} from './stationRegistry';

/**
 * 🔥 HUB CENTRAL MULTI-LIGNES
 * Blagnac = T1 + C + LAE
 * → Une seule définition logique
 * → Injectée dans chaque ligne pour la topologie
 * → Fusionnée via lieuName côté UI
 */
const HUB_BLAGNAC_DEF = REGISTRY_INTERCHANGE_HUBS.find(h => h.id === 'sta-hub-bla');

const mapDefToStation = (def: StationDef): Partial<Station> => ({
    id: def.id,
    name: def.name,
    code: def.code,
    isFuture: def.isFuture,
    lieuName: def.lieuName ?? def.name,
    lines: def.lines,
});

export const HUB_BLAGNAC: Partial<Station> = HUB_BLAGNAC_DEF ? mapDefToStation(HUB_BLAGNAC_DEF) : {
    id: 'sta-hub-bla',
    name: 'Blagnac',
    code: 'BLA',
    lieuName: 'Blagnac',
    isFuture: true,
    lines: ['T1', 'C', 'LAE'],
};

/* =========================
   LIGNE A
========================= */
export const LINE_A_STATIONS: Partial<Station>[] = REGISTRY_LINE_A.map(mapDefToStation);

/* =========================
   LIGNE B
========================= */
export const LINE_B_STATIONS: Partial<Station>[] = REGISTRY_LINE_B.map(mapDefToStation);

/* =========================
   LIGNE C
========================= */
const rawLineC = REGISTRY_LINE_C.map(mapDefToStation);
// Injection BLA entre SMA (sta-c-4) et SDN (sta-c-6)
const smaIndex = rawLineC.findIndex(s => s.id === 'sta-c-4');
if (smaIndex !== -1) {
    rawLineC.splice(smaIndex + 1, 0, HUB_BLAGNAC);
}
export const LINE_C_STATIONS: Partial<Station>[] = ACTIVE_LINES.C ? rawLineC : [];

/* =========================
   TRAM T1
========================= */
const rawTram = REGISTRY_TRAM_T1.map(mapDefToStation);
// Injection BLA entre ANC (sta-t1-14) et SER (sta-t1-15)
const ancIndex = rawTram.findIndex(s => s.id === 'sta-t1-14');
if (ancIndex !== -1) {
    rawTram.splice(ancIndex + 1, 0, HUB_BLAGNAC);
}
export const TRAM_STATIONS: Partial<Station>[] = rawTram;

/* =========================
   TELEO
========================= */
export const TELEO_STATIONS: Partial<Station>[] = REGISTRY_TELEO.map(mapDefToStation);

/* =========================
   AEROPORT EXPRESS (LAE)
========================= */
// Sur la LAE, la station Blagnac s'appelle officiellement "Blagnac-Jean Maga"
const LAE_TERMINUS_BLAGNAC: Partial<Station> = { ...HUB_BLAGNAC, name: 'Blagnac-Jean Maga' };

export const AEROPORT_EXPRESS_STATIONS: Partial<Station>[] = ACTIVE_LINES.AEROPORT
    ? [LAE_TERMINUS_BLAGNAC, ...REGISTRY_AEROPORT_EXPRESS.map(mapDefToStation)]
    : [];


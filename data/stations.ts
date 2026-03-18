
import { Station } from '../types';
import {
    REGISTRY_AEROPORT_EXPRESS,
    REGISTRY_INTERCHANGE_HUBS,
    ACTIVE_LINES,
} from './stationRegistry';

export const LINE_A_STATIONS: Partial<Station>[] = [
    { id: 'sta-a-1', name: 'Basso Cambo', code: 'MBC' },
    { id: 'sta-a-2', name: 'Bellefontaine', code: 'BEL' },
    { id: 'sta-a-3', name: 'Reynerie', code: 'REY' },
    { id: 'sta-a-4', name: 'Mirail-Université', code: 'MUN' },
    { id: 'sta-a-5', name: 'Bagatelle', code: 'BAG' },
    { id: 'sta-a-6', name: 'Mermoz', code: 'MER' },
    { id: 'sta-a-7', name: 'Fontaine-Lestang', code: 'FLE' },
    { id: 'sta-a-8', name: 'Arènes', code: 'ARE', lieuName: 'Arènes' },
    { id: 'sta-a-9', name: 'Patte d\'Oie', code: 'POI' },
    { id: 'sta-a-10', name: 'Saint-Cyprien - République', code: 'SCY' },
    { id: 'sta-a-11', name: 'Esquirol', code: 'ESQ' },
    { id: 'sta-a-12', name: 'Capitole', code: 'CAP' },
    { id: 'sta-a-13', name: 'Jean-Jaurès', code: 'JJA', lieuName: 'Jean-Jaurès' },
    { id: 'sta-a-14', name: 'Marengo-SNCF', code: 'MAR', lieuName: 'Marengo-SNCF' },
    { id: 'sta-a-15', name: 'Jolimont', code: 'JOL' },
    { id: 'sta-a-16', name: 'Roseraie', code: 'ROS' },
    { id: 'sta-a-17', name: 'Argoulets', code: 'ARG' },
    { id: 'sta-a-18', name: 'Balma-Gramont', code: 'BGR' },
];

export const LINE_B_STATIONS: Partial<Station>[] = [
    { id: 'sta-b-1', name: 'Borderouge', code: 'BOR' },
    { id: 'sta-b-2', name: 'Trois Cocus', code: 'TCO' },
    { id: 'sta-b-3', name: 'La Vache', code: 'LVA', lieuName: 'La Vache' },
    { id: 'sta-b-4', name: 'Barrière de Paris', code: 'BPA' },
    { id: 'sta-b-5', name: 'Minimes - Claude Nougaro', code: 'MIN' },
    { id: 'sta-b-6', name: 'Canal du Midi', code: 'CAN' },
    { id: 'sta-b-7', name: 'Compans-Caffarelli', code: 'CCA' },
    { id: 'sta-b-8', name: 'Jeanne d\'Arc', code: 'JAR' },
    { id: 'sta-b-9', name: 'Jean-Jaurès', code: 'JJB', lieuName: 'Jean-Jaurès' },
    { id: 'sta-b-10', name: 'François Verdier', code: 'FVE', lieuName: 'François Verdier' },
    { id: 'sta-b-11', name: 'Carmes', code: 'CAR' },
    { id: 'sta-b-12', name: 'Palais de Justice', code: 'PDJ', lieuName: 'Palais de Justice' },
    { id: 'sta-b-13', name: 'Saint-Michel - Marcel Langer', code: 'SMI' },
    { id: 'sta-b-14', name: 'Empalot', code: 'EMP' },
    { id: 'sta-b-15', name: 'Saint-Agne - SNCF', code: 'SAG' },
    { id: 'sta-b-16', name: 'Saouzelong', code: 'SAO' },
    { id: 'sta-b-17', name: 'Rangueil', code: 'RAN' },
    { id: 'sta-b-18', name: 'Faculté de Pharmacie', code: 'PHA' },
    { id: 'sta-b-19', name: 'Université Paul Sabatier', code: 'UPS', lieuName: 'Université Paul-Sabatier' },
    { id: 'sta-b-20', name: 'Ramonville', code: 'RAM' },
    { id: 'sta-b-21', name: 'Parc du Canal', isFuture: true },
    { id: 'sta-b-22', name: 'Labège Madron', isFuture: true, lieuName: 'Labège Madron' },
];

export const LINE_C_STATIONS: Partial<Station>[] = [
    { id: 'sta-c-1', name: 'Colomiers Gare', code: 'COG', isFuture: true },
    { id: 'sta-c-3', name: 'Fontaine Lumineuse', code: 'FLU', isFuture: true },
    { id: 'sta-c-4', name: 'Saint-Martin-du-Touch', code: 'SMA', isFuture: true },
    // sta-c-5 (BLA / Blagnac) est inclus via LINE_C_STATIONS pour le builder
    // mais son rôle de HUB multi-lignes est géré dans stationRegistry.ts.
    { id: 'sta-c-5', name: 'Blagnac', code: 'BLA', isFuture: true },
    { id: 'sta-c-6', name: 'Sept Deniers – Stade Toulousain', code: 'SDN', isFuture: true },
    { id: 'sta-c-7', name: 'Ponts-Jumeaux', code: 'PJU', isFuture: true },
    { id: 'sta-c-8', name: 'Fondeyre', code: 'FON', isFuture: true },
    { id: 'sta-c-9', name: 'La Vache', code: 'LVH', isFuture: true, lieuName: 'La Vache' },
    { id: 'sta-c-10', name: 'Lycée Toulouse-Lautrec', code: 'TLA', isFuture: true },
    { id: 'sta-c-11', name: 'Raisin', code: 'RAI', isFuture: true },
    { id: 'sta-c-12', name: 'Bonnefoy', code: 'BON', isFuture: true },
    { id: 'sta-c-13', name: 'Matabiau Gare', code: 'MAT', isFuture: true, lieuName: 'Marengo-SNCF' },
    { id: 'sta-c-14', name: 'François-Verdier', code: 'FVD', isFuture: true, lieuName: 'François Verdier' },
    { id: 'sta-c-15', name: 'Côte Pavée', code: 'CPA', isFuture: true },
    { id: 'sta-c-16', name: 'Limayrac – Cité de l\u2019Espace', code: 'LIM', isFuture: true },
    { id: 'sta-c-17', name: 'Ormeau', code: 'ORM', isFuture: true },
    { id: 'sta-c-18', name: 'Montaudran Gare', code: 'MOG', isFuture: true },
    { id: 'sta-c-19', name: 'Aerospace Campus', code: 'AEC', isFuture: true },
    { id: 'sta-c-20', name: 'Labège Madron', code: 'LMA', isFuture: true, lieuName: 'Labège Madron' },
    { id: 'sta-c-21', name: 'Diagora', code: 'DIA', isFuture: true },
    { id: 'sta-c-22', name: 'Labège Gare', code: 'LAG', isFuture: true },
];

/**
 * Stations Tram T1 — trigrammes SI officiels (v5).
 *
 * v7 changes vs v6 :
 *   • CCH (Casselardit) SUPPRIMÉ — absent du référentiel SI officiel
 *
 * v6 changes vs v5 :
 *   • ACO = Déodat de Séverac     (était DSV en v5 — code SI officiel confirmé)
 *   • ARE = Arènes T1             (était ARO en v5 ; = ARE Métro A, même lieuName 'Arènes')
 *   • ARO = Arènes Romaines       (était ARR en v5)
 *
 * v5 changes vs v4 :
 *   • MRO = Avenue de Muret – Marcel Cavaillé (était ODY en v4)
 *   • ODY = Odyssud – Ritouret               (était MRO en v4)
 *   • Hôpital Purpan supprimé → remplacé par :
 *       - sta-t1-8  Hippodrome         HIP  (NOUVEAU)
 *       - sta-t1-13 Arènes Romaines    ARO  (NOUVEAU v5, code validé v6)
 *   • Aéroconstellation renommé (suppression "Garossos-")
 *
 * PSM = Palais de Justice T1  (distinct du PDJ Métro B, même lieuName)
 * ARE = Arènes T1             (= ARE Métro A, même lieuName 'Arènes' — même lieu physique)
 * ARO = Arènes Romaines T1   (code SI officiel v6)
 */
export const TRAM_STATIONS: Partial<Station>[] = [
    { id: 'sta-t1-1',  name: 'Palais de Justice',                  code: 'PSM', lieuName: 'Palais de Justice' },
    { id: 'sta-t1-2',  name: 'Île du Ramier',                      code: 'LDD' },
    { id: 'sta-t1-3',  name: 'Fer à Cheval',                       code: 'FAC' },
    { id: 'sta-t1-4',  name: 'Avenue de Muret – Marcel Cavaillé',  code: 'MRO' },
    { id: 'sta-t1-5',  name: 'Croix de Pierre',                    code: 'CDP' },
    { id: 'sta-t1-6',  name: 'Déodat de Séverac',                  code: 'ACO' },
    { id: 'sta-t1-7',  name: 'Arènes',                             code: 'ARE', lieuName: 'Arènes' },
    { id: 'sta-t1-8',  name: 'Hippodrome',                         code: 'HIP' },
    { id: 'sta-t1-9',  name: 'Zénith',                             code: 'ZTH' },
    { id: 'sta-t1-10', name: 'Cartoucherie',                       code: 'RAP' },
    { id: 'sta-t1-12', name: 'Purpan',                             code: 'PUR' },
    { id: 'sta-t1-13', name: 'Arènes Romaines',                    code: 'ARO' },
    { id: 'sta-t1-14', name: 'Ancely',                             code: 'ANC' },
    { id: 'sta-t1-15', name: 'Servanty – Airbus',                  code: 'SER' },
    { id: 'sta-t1-16', name: 'Guyenne – Berry',                    code: 'GUY' },
    { id: 'sta-t1-17', name: 'Pasteur – Mairie de Blagnac',        code: 'PAS' },
    { id: 'sta-t1-18', name: 'Place du Relais',                    code: 'REL' },
    { id: 'sta-t1-19', name: 'Odyssud – Ritouret',                 code: 'ODY' },
    { id: 'sta-t1-20', name: 'Patinoire – Barradels',              code: 'PTN' },
    { id: 'sta-t1-21', name: 'Grand Noble',                        code: 'GNO' },
    { id: 'sta-t1-22', name: 'Place Georges Brassens',             code: 'GBR' },
    { id: 'sta-t1-23', name: 'Andromède – Lycée',                  code: 'LYC' },
    { id: 'sta-t1-24', name: 'Beauzelle – Aéroscopia',             code: 'BEA' },
    { id: 'sta-t1-25', name: 'Aéroconstellation',                  code: 'GAS' },
    { id: 'sta-t1-26', name: 'MEETT',                              code: 'MET' },
];

export const TELEO_STATIONS: Partial<Station>[] = [
    { id: 'sta-tel-1', name: 'Oncopole-Lise Enjalbert',       code: 'OLE' },
    { id: 'sta-tel-2', name: 'Hôpital Rangueil-Louis Lareng', code: 'HRG' },
    { id: 'sta-tel-3', name: 'Université Paul-Sabatier',       code: 'UPT', lieuName: 'Université Paul-Sabatier' },
];

/**
 * Stations de l'antenne Aéroport Express pour le builder.ts.
 *
 * Contient :
 *   • BLA (Blagnac / Jean Maga) — extrait depuis REGISTRY_INTERCHANGE_HUBS
 *   • NAD, DAU, ATB             — extraits depuis REGISTRY_AEROPORT_EXPRESS
 *
 * Ce tableau est VIDE tant que ACTIVE_LINES.AEROPORT = false.
 * Pour activer : modifier ACTIVE_LINES dans stationRegistry.ts uniquement.
 *
 * Usage dans builder.ts (quand activé) :
 *   import { AEROPORT_EXPRESS_STATIONS } from './stations';
 *   // Traiter comme TRAM_STATIONS avec isBranch = true
 */
export const AEROPORT_EXPRESS_STATIONS: Partial<Station>[] = ACTIVE_LINES.AEROPORT
    ? [
        // BLA — HUB multi-lignes (T1 + AEROPORT + C)
        ...REGISTRY_INTERCHANGE_HUBS
            .filter(def => def.lines.includes('AEROPORT'))
            .map(def => ({
                id:       def.id,
                name:     def.publicName ?? def.name,
                code:     def.code,
                isFuture: def.isFuture,
                lieuName: def.lieuName,
            })),
        // NAD, DAU, ATB — stations propres à l'antenne
        ...REGISTRY_AEROPORT_EXPRESS.map(def => ({
            id:       def.id,
            name:     def.publicName ?? def.name,
            code:     def.code,
            isFuture: def.isFuture,
            lieuName: def.lieuName,
        })),
    ]
    : [];

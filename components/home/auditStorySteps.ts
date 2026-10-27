// components/home/auditStorySteps.ts
// Récit de la page d'accueil — le VRAI parcours d'un audit DAT, en trois temps
// (le quatrième, « À vous », est la démo interactive : HomeAuditDemo).
//   01 Sur le terrain        → LieuSelector + ModuleSelector (contexte, court)
//   02 Contrôler, qualifier  → AdhesiveAuditForm renseigné (le geste)
//   03 Du constat à la décision → cockpit : Synthèse, Analyse des anomalies,
//                               liste d'intervention exportable (MaintenanceListModal)
// Les écrans sont des captures de l'application, régénérées par
// scripts/capture-home-story.cjs qui imprime aussi les zones `focus`
// (en % de l'image). Aucune donnée ni logique de l'app n'est importée ici.

export interface StoryFocus {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface StoryShot {
    src: string;
    width: number;
    height: number;
    focus: StoryFocus;
}

export interface StoryFrame {
    id: string;
    /** Légende courte affichée sous l'écran. */
    caption: string;
    alt: string;
    desktop: StoryShot;
    mobile: StoryShot;
    /** Part de la piste de scroll (en svh) : le contexte passe vite, la décision prend son temps. */
    scroll: number;
}

export interface AuditStoryStep {
    id: string;
    title: string;
    text: string;
    /** Ce que l'application a enregistré à l'issue du temps. */
    trail: string;
    frames: StoryFrame[];
}

const shot = (id: string, format: 'desktop' | 'mobile', focus: StoryFocus): StoryShot => ({
    src: `/images/home-story/${id}-${format}.webp`,
    width: format === 'desktop' ? 2048 : 780,
    height: format === 'desktop' ? 1280 : 1520,
    focus,
});

export const AUDIT_STORY_STEPS: AuditStoryStep[] = [
    {
        id: 'terrain',
        title: 'Sur le terrain',
        text: "En station, l'agent retrouve le lieu puis l'équipement à contrôler. Même sans réseau.",
        trail: 'Arènes · DAT ligne A',
        frames: [
            {
                id: '01-lieu',
                caption: 'Tableau de bord · recherche du lieu',
                alt: "Tableau de bord AuditRef : recherche « Arènes » et suggestions de lieux, onglets par ligne avec leur progression.",
                desktop: shot('01-lieu', 'desktop', { x: 2.3, y: 42.5, w: 95.3, h: 23.6 }),
                mobile: shot('01-lieu', 'mobile', { x: 0, y: 33.2, w: 100, h: 21.1 }),
                scroll: 35,
            },
            {
                id: '02-module',
                caption: 'Station Arènes · modules à auditer',
                alt: 'Écran de la station Arènes : liste des modules à auditer (DAT ligne A, DAT T1, équipements station, ECA, adhésifs PMR au sol) avec leur progression.',
                desktop: shot('02-module', 'desktop', { x: 2.3, y: 24.4, w: 95.3, h: 22.5 }),
                mobile: shot('02-module', 'mobile', { x: 0, y: 20.5, w: 100, h: 18.9 }),
                scroll: 35,
            },
        ],
    },
    {
        id: 'controle',
        title: 'Contrôler et qualifier',
        text: "Chaque repère attendu est listé avec son visuel, ses dimensions et son emplacement. Un geste suffit : OK, Absent ou À remplacer.",
        trail: '1 à remplacer · 1 absent',
        frames: [
            {
                id: '04-anomalie',
                caption: 'DAT 01 · repère 6 à remplacer, repère 9 absent',
                alt: "Formulaire d'audit renseigné : repère 6 marqué « À remplacer », repère 9 « Absent », les autres « OK ».",
                desktop: shot('04-anomalie', 'desktop', { x: 2.3, y: 10.5, w: 95.3, h: 26.4 }),
                mobile: shot('04-anomalie', 'mobile', { x: 0, y: 29.6, w: 100, h: 40.7 }),
                scroll: 80,
            },
        ],
    },
    {
        id: 'decision',
        title: 'Du constat à la décision',
        text: "Les constats remontent aussitôt dans le cockpit. Chaque anomalie est classée, urgente ou à planifier, et la liste d'intervention s'exporte.",
        trail: '1 urgente · 1 à planifier · liste exportable',
        frames: [
            {
                id: '05-synthese',
                caption: 'Cockpit · état des anomalies',
                alt: "Cockpit signalétique, onglet Synthèse : bloc « État des anomalies » indiquant 2 anomalies Signalétique IV, 1 absente et 1 à remplacer.",
                desktop: shot('05-synthese', 'desktop', { x: 6.4, y: 62.9, w: 19.3, h: 27.6 }),
                mobile: shot('05-synthese', 'mobile', { x: 10.8, y: 52, w: 78.5, h: 23.3 }),
                scroll: 60,
            },
            {
                id: '06-priorite',
                caption: 'Analyse des anomalies · urgent / à planifier',
                alt: "Cockpit, onglet Analyse des anomalies : le repère 9 classé « Urgent », le repère 6 « À planifier ».",
                desktop: shot('06-priorite', 'desktop', { x: 2.3, y: 38.4, w: 30.1, h: 60.2 }),
                mobile: shot('06-priorite', 'mobile', { x: 0, y: 42.1, w: 95.6, h: 50.7 }),
                scroll: 60,
            },
            {
                id: '07-liste',
                caption: "Liste d'intervention · export CSV",
                alt: "Liste des anomalies constatées : Arènes, Salle des billets, DAT 01 — repère 6 à remplacer, repère 9 absent — avec le bouton « Exporter (CSV) ».",
                desktop: shot('07-liste', 'desktop', { x: 0.9, y: 16.6, w: 58.1, h: 38.8 }),
                mobile: shot('07-liste', 'mobile', { x: 2.2, y: 24.2, w: 95.5, h: 47.1 }),
                scroll: 60,
            },
        ],
    },
];

// components/home/auditStorySteps.ts
// Étapes du storytelling de la page d'accueil — le VRAI parcours d'un audit
// DAT (AppRouter : LieuSelector → ModuleSelector → DATList → AdhesiveAuditForm
// → cockpit StatsPage). Les écrans sont des captures de l'application,
// régénérées par scripts/capture-home-story.cjs qui imprime aussi les zones
// `focus` (en % de l'image). Aucune donnée ni logique de l'app n'est importée :
// la page d'accueil reste découplée de l'InApp.

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

export interface AuditStoryStep {
    id: string;
    title: string;
    text: string;
    /** Ce que l'application a enregistré à l'issue de l'étape. */
    trail: string;
    alt: string;
    desktop: StoryShot;
    mobile: StoryShot;
}

const shot = (id: string, format: 'desktop' | 'mobile', focus: StoryFocus): StoryShot => ({
    src: `/images/home-story/${id}-${format}.webp`,
    width: format === 'desktop' ? 2048 : 780,
    height: format === 'desktop' ? 1280 : 1520,
    focus,
});

export const AUDIT_STORY_STEPS: AuditStoryStep[] = [
    {
        id: '01-lieu',
        title: 'Choisir le lieu',
        text: "Depuis le tableau de bord, l'auditeur retrouve sa station par ligne ou par recherche. Chaque lieu affiche sa progression.",
        trail: 'Arènes',
        alt: "Tableau de bord AuditRef : recherche « Arènes » et suggestions de lieux, onglets par ligne avec leur progression.",
        desktop: shot('01-lieu', 'desktop', { x: 2.3, y: 42.5, w: 95.3, h: 23.6 }),
        mobile: shot('01-lieu', 'mobile', { x: 0, y: 33.2, w: 100, h: 21.1 }),
    },
    {
        id: '02-module',
        title: 'Ouvrir le bon module',
        text: 'Une station regroupe ses modules : DAT, valideurs, adhésifs PMR au sol, pictogrammes cognitifs, P+R, plans de quartier. On ouvre celui du jour.',
        trail: 'DAT · ligne A',
        alt: 'Écran de la station Arènes : liste des modules à auditer (DAT ligne A, DAT T1, équipements station, ECA, adhésifs PMR au sol) avec leur progression.',
        desktop: shot('02-module', 'desktop', { x: 2.3, y: 24.4, w: 95.3, h: 22.5 }),
        mobile: shot('02-module', 'mobile', { x: 0, y: 20.5, w: 100, h: 18.9 }),
    },
    {
        id: '03-controle',
        title: 'Contrôler repère par repère',
        text: "Pour chaque distributeur, l'application liste les repères attendus avec leur visuel, leurs dimensions et leur emplacement exact. Rien à mémoriser.",
        trail: 'DAT 01 · 10 repères',
        alt: "Formulaire d'audit du DAT 01 à Arènes : chaque repère avec son visuel, ses dimensions, sa localisation et les choix OK, Absent, À remplacer.",
        desktop: shot('03-controle', 'desktop', { x: 2.3, y: 36.6, w: 95.3, h: 18.9 }),
        mobile: shot('03-controle', 'mobile', { x: 0, y: 31.4, w: 100, h: 34.3 }),
    },
    {
        id: '04-anomalie',
        title: "Qualifier l'anomalie",
        text: 'Un geste par repère : OK, Absent ou À remplacer. Un commentaire précise le constat, au clavier ou à la voix.',
        trail: '1 à remplacer · 1 absent',
        alt: "Formulaire d'audit renseigné : repère 6 marqué « À remplacer », repère 9 « Absent », les autres « OK », et un commentaire décrivant le constat.",
        desktop: shot('04-anomalie', 'desktop', { x: 2.3, y: 10.5, w: 95.3, h: 26.4 }),
        mobile: shot('04-anomalie', 'mobile', { x: 0, y: 29.6, w: 100, h: 40.7 }),
    },
    {
        id: '05-synthese',
        title: 'Retrouver la synthèse',
        text: 'Le cockpit agrège les constats de tout le réseau. Les deux anomalies saisies sur le terrain y figurent déjà.',
        trail: '2 anomalies remontées',
        alt: "Cockpit signalétique, onglet Synthèse : bloc « État des anomalies » indiquant 2 anomalies Signalétique IV, 1 absente et 1 à remplacer.",
        desktop: shot('05-synthese', 'desktop', { x: 6.4, y: 62.9, w: 19.3, h: 27.6 }),
        mobile: shot('05-synthese', 'mobile', { x: 10.8, y: 52, w: 78.5, h: 23.3 }),
    },
    {
        id: '06-priorite',
        title: 'Prioriser et agir',
        text: "L'analyse classe chaque anomalie — urgente ou à planifier — et la liste s'exporte pour lancer l'intervention.",
        trail: '1 urgente · 1 à planifier',
        alt: "Cockpit, onglet Analyse des anomalies : le repère 9 classé « Urgent », le repère 6 « À planifier », bouton « Voir en liste / Exporter ».",
        desktop: shot('06-priorite', 'desktop', { x: 2.3, y: 38.4, w: 30.1, h: 60.2 }),
        mobile: shot('06-priorite', 'mobile', { x: 0, y: 42.1, w: 95.6, h: 50.7 }),
    },
];

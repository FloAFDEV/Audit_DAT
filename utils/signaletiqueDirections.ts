// utils/signaletiqueDirections.ts
// Règle unique reliant une direction réelle de la station (station.directions,
// ex. « Direction MEETT / Aéroport ») à son emplacement de stockage dans
// SignaletiqueData (biv/planReseau/planQuartier/hap indexés meett/pdj).
// Partagée par le formulaire Équipements Station et le cockpit : une seule
// règle, aucune seconde liste de directions.
export const dirKeyOf = (name: string): 'meett' | 'pdj' => {
  const n = name.toLowerCase();
  if (n.includes('meett') || n.includes('aéroport')) return 'meett';
  return 'pdj';
};

// Terminus T1 : le bandeau du plan de quartier y porte un texte « Terminus »
// au lieu de la direction — partagé par Équipements Station et l'audit T1.
export const TERMINUS_STATIONS = ['Palais de Justice', 'MEETT'];
export const TERMINUS_BANDEAU_TEXT = 'Terminus (avec le picto ligne(s)) / Merci de ne pas monter à bord / Les départs se font depuis le quai opposé';

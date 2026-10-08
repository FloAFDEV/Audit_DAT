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

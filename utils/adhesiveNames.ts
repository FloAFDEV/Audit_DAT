// utils/adhesiveNames.ts
// Découpage du nom catalogue d'un adhésif « Repère N - Libellé » en repère
// et libellé — règle unique de la Nomenclature (hooks/useStats.ts) et de
// l'export CSV d'audit (utils/csvExporter.ts). Nom sans repère : libellé
// entier, repère vide.

export const parseAdhesiveName = (name: string | undefined): { repere: string; name: string } => {
    if (!name) return { repere: '', name: '' };
    const repereMatch = name.match(/^Repère\s+([\w\d]+)\s*-\s*(.*)$/);
    if (repereMatch) {
        return { repere: repereMatch[1], name: repereMatch[2].trim() };
    }
    return { repere: '', name: name };
};

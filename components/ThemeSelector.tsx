import React from 'react';
import useAuditStore from '../store';
import { Sun, Moon } from 'lucide-react';

const ThemeSelector: React.FC = () => {
    const { theme, setTheme } = useAuditStore();

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    return (
        <button
            onClick={toggleTheme}
            className="flex-shrink-0 p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors"
            aria-label={theme === 'light' ? 'Passer au thème sombre' : 'Passer au thème clair'}
            title={theme === 'light' ? 'Passer au thème sombre' : 'Passer au thème clair'}
        >
            {/* L'utilisation d'une clé sur l'icône force React à la remonter, ce qui permet des animations CSS */}
            {theme === 'light' ? (
                <Moon key="moon" className="w-5 h-5" />
            ) : (
                <Sun key="sun" className="w-5 h-5" />
            )}
        </button>
    );
};

export default ThemeSelector;

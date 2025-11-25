
import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = "w-10 h-10" }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Forme de bouclier stylisé pour évoquer la "Référence" et la sécurité */}
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" className="text-teal-600 dark:text-teal-400" stroke="currentColor" fill="currentColor" fillOpacity="0.1" />
      
      {/* Coche de validation pour évoquer l'"Audit" */}
      <path d="m9 12 2 2 4-4" className="text-teal-600 dark:text-teal-400" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
};

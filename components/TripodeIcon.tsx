import React from 'react';

/**
 * A custom icon component representing a turnstile/tripode, designed to be
 * visually similar to the reference image provided by the user.
 * It uses SVG paths and is styled to integrate with Lucide-React's conventions.
 */
export const TripodeIcon: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            {/* Vertical post */}
            <line x1="7" y1="19" x2="7" y2="5" />
            {/* Pivot point - using a tiny circle with fill to look solid */}
            <circle cx="7" cy="9" r="0.5" fill="currentColor" stroke="none" />
            {/* Horizontal arm */}
            <line x1="7" y1="9" x2="17" y2="9" />
            {/* Angled arm */}
            <line x1="7" y1="12" x2="14" y2="15" />
        </svg>
    );
};

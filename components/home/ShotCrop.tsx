// components/home/ShotCrop.tsx
// Gros plan sur une zone d'une vraie capture (en % de l'image), affiché à la
// taille de son conteneur : le ratio suit la zone, le texte reste net
// (captures en ×2). Aucune image supplémentaire : CSS seul.
import React from 'react';
import type { StoryFocus, StoryShot } from './auditStorySteps';

interface ShotCropProps {
    shot: StoryShot;
    rect: StoryFocus;
    alt: string;
    className?: string;
    eager?: boolean;
}

export const ShotCrop: React.FC<ShotCropProps> = ({ shot, rect, alt, className = '', eager = false }) => (
    <div
        className={`relative overflow-hidden ${className}`}
        style={{ aspectRatio: `${(rect.w * shot.width) / (rect.h * shot.height)}` }}
    >
        <img
            src={shot.src}
            alt={alt}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            draggable={false}
            className="absolute max-w-none select-none"
            style={{
                width: `${10000 / rect.w}%`,
                left: `${(-rect.x * 100) / rect.w}%`,
                top: `${(-rect.y * 100) / rect.h}%`,
            }}
        />
    </div>
);

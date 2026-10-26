// tests/voiceInput.test.ts
// Dictée vocale (components/VoiceInput.tsx) : règles d'ajout du texte dicté
// et messages d'erreur — le moteur de reconnaissance lui-même n'existe pas
// dans l'environnement de test (vérifié dans le navigateur).
import { describe, it, expect } from 'vitest';
import { appendTranscript, collectRecognitionResults, speechErrorMessage } from '../components/VoiceInput';

const result = (transcript: string, isFinal: boolean) => Object.assign([{ transcript }], { isFinal });

describe('dictée vocale', () => {
    it('le texte dicté s\'ajoute à la saisie, séparé par une espace', () => {
        expect(appendTranscript('', ' adhésif décollé ')).toBe('adhésif décollé');
        expect(appendTranscript('Constat :', 'adhésif décollé')).toBe('Constat : adhésif décollé');
        expect(appendTranscript('Constat : ', 'adhésif')).toBe('Constat : adhésif');
        expect(appendTranscript('Constat', '   ')).toBe('Constat');
    });

    it('chaque phrase finale n\'est ajoutée qu\'une fois ; le provisoire est tenu à part', () => {
        const committed = new Set<number>();
        expect(collectRecognitionResults([result('adhésif', false)], 0, committed)).toEqual({ finals: [], interim: 'adhésif' });
        expect(collectRecognitionResults([result('adhésif décollé', true)], 0, committed)).toEqual({ finals: ['adhésif décollé'], interim: '' });
        // Même résultat renvoyé par le moteur (Android) : pas de doublon.
        expect(collectRecognitionResults([result('adhésif décollé', true), result('à reprendre', false)], 0, committed))
            .toEqual({ finals: [], interim: 'à reprendre' });
        expect(collectRecognitionResults([result('adhésif décollé', true), result('à reprendre', true)], 1, committed))
            .toEqual({ finals: ['à reprendre'], interim: '' });
    });

    it('erreurs : un message explicite, sauf arrêt volontaire', () => {
        expect(speechErrorMessage('aborted')).toBeNull();
        expect(speechErrorMessage('not-allowed')).toMatch(/Micro non autorisé/);
        expect(speechErrorMessage('service-not-allowed')).toMatch(/Siri et Dictée/);
        expect(speechErrorMessage('network')).toMatch(/connexion/);
        expect(speechErrorMessage('no-speech')).toMatch(/Aucune parole/);
        expect(speechErrorMessage('bizarre')).toMatch(/bizarre/);
    });
});


import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import toast from 'react-hot-toast';

interface VoiceInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    readOnly?: boolean;
    rows?: number;
}

declare global {
    interface Window {
        webkitSpeechRecognition: any;
        SpeechRecognition: any;
    }
}

const getRecognitionCtor = (): any =>
    typeof window === 'undefined' ? undefined : (window.SpeechRecognition || window.webkitSpeechRecognition);

/** Mobile (Android, iPhone, iPad) : une phrase par appui — le mode continu y
 *  double les phrases (Android) ou ne les finalise jamais (iOS). */
const isMobileDevice = (): boolean =>
    typeof navigator !== 'undefined'
    && (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

/** Ajoute un texte dicté à la saisie existante, séparé par une espace. */
export const appendTranscript = (current: string, transcript: string): string => {
    const text = transcript.trim();
    if (!text) return current;
    const separator = current && !/\s$/.test(current) ? ' ' : '';
    return `${current}${separator}${text}`;
};

/** Résultats d'un événement de reconnaissance : textes finaux pas encore
 *  ajoutés (marqués ajoutés dans `committed`) et texte provisoire en cours. */
export const collectRecognitionResults = (
    results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>, resultIndex: number, committed: Set<number>,
): { finals: string[]; interim: string } => {
    const finals: string[] = [];
    let interim = '';
    for (let i = resultIndex; i < results.length; i++) {
        const transcript = results[i]?.[0]?.transcript ?? '';
        if (results[i]?.isFinal) {
            if (!committed.has(i)) {
                committed.add(i);
                finals.push(transcript);
            }
        } else {
            interim += transcript;
        }
    }
    return { finals, interim };
};

/** Message affiché pour une erreur de reconnaissance ; null si rien à dire. */
export const speechErrorMessage = (error: string): string | null => {
    switch (error) {
        case 'aborted':
            return null;
        case 'no-speech':
            return 'Aucune parole détectée — réessayez.';
        case 'not-allowed':
        case 'service-not-allowed':
            return "Micro non autorisé : autorisez l'accès au micro pour ce site (iPhone / iPad : Réglages › Siri et Dictée). Le micro du clavier reste utilisable.";
        case 'audio-capture':
            return 'Aucun micro détecté sur cet appareil.';
        case 'network':
            return 'Dictée indisponible sans connexion réseau — utilisez le micro du clavier.';
        case 'language-not-supported':
            return 'Dictée en français indisponible sur cet appareil — utilisez le micro du clavier.';
        default:
            return `Dictée vocale indisponible (${error}) — utilisez le micro du clavier.`;
    }
};

const VoiceInput: React.FC<VoiceInputProps> = ({ value, onChange, placeholder, readOnly, rows = 4 }) => {
    const [isListening, setIsListening] = useState(false);
    const [isSupported] = useState(() => !!getRecognitionCtor());
    const recognitionRef = useRef<any>(null);

    // Valeur et destination courantes : lues au moment où le texte arrive,
    // jamais celles du premier rendu (le champ visé peut changer).
    const valueRef = useRef(value);
    const onChangeRef = useRef(onChange);
    useEffect(() => { valueRef.current = value; }, [value]);
    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

    const commit = (transcript: string) => {
        const next = appendTranscript(valueRef.current, transcript);
        if (next === valueRef.current) return;
        valueRef.current = next;
        onChangeRef.current(next);
    };

    // Écran quitté pendant une dictée : la reconnaissance est arrêtée.
    useEffect(() => () => {
        const recognition = recognitionRef.current;
        recognitionRef.current = null;
        if (recognition) {
            recognition.onresult = recognition.onend = recognition.onerror = null;
            try { recognition.abort(); } catch { /* déjà arrêtée */ }
        }
    }, []);

    const startListening = () => {
        const Recognition = getRecognitionCtor();
        if (!Recognition) return;
        // Instance neuve à chaque session (iOS bloque souvent une instance
        // réutilisée après une erreur).
        const recognition = new Recognition();
        recognition.lang = 'fr-FR';
        recognition.continuous = !isMobileDevice();
        recognition.interimResults = true;

        const committed = new Set<number>();
        let pendingInterim = '';

        recognition.onresult = (event: any) => {
            const { finals, interim } = collectRecognitionResults(event.results, event.resultIndex, committed);
            finals.forEach(commit);
            pendingInterim = interim;
        };
        recognition.onerror = (event: any) => {
            const message = speechErrorMessage(event?.error ?? 'unknown');
            if (message) toast.error(message, { id: 'voice-input-error', duration: 6000 });
        };
        recognition.onend = () => {
            // iOS ne marque pas toujours la dernière phrase comme finale :
            // le texte provisoire restant est conservé plutôt que perdu.
            if (pendingInterim) commit(pendingInterim);
            pendingInterim = '';
            if (recognitionRef.current === recognition) recognitionRef.current = null;
            setIsListening(false);
        };

        try {
            recognition.start();
            recognitionRef.current = recognition;
            setIsListening(true);
        } catch (error) {
            console.error('Erreur lors du démarrage de la reconnaissance vocale:', error);
            toast.error(speechErrorMessage('unknown') ?? '', { id: 'voice-input-error' });
            setIsListening(false);
        }
    };

    const toggleListening = () => {
        if (isListening) {
            // stop() : les derniers résultats arrivent encore, puis onend.
            try { recognitionRef.current?.stop(); } catch { /* déjà arrêtée */ }
            if (!recognitionRef.current) setIsListening(false);
        } else {
            startListening();
        }
    };

    return (
        <div className="relative">
            <textarea
                rows={rows}
                className="block w-full rounded-lg border-0 bg-white dark:bg-slate-900 px-3 py-2 text-base text-gray-900 dark:text-slate-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-600 placeholder:text-gray-500 dark:placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-teal-600 dark:focus:ring-teal-500 leading-6 read-only:bg-slate-100 read-only:dark:bg-slate-800 pr-12"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                readOnly={readOnly}
            />
            {isSupported && !readOnly && (
                <button
                    type="button"
                    onClick={toggleListening}
                    className={`absolute bottom-2 right-2 p-2 rounded-full transition-all duration-200 shadow-md ${
                        isListening
                        ? 'bg-red-600 text-white animate-pulse'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
                    }`}
                    title={isListening ? "Arrêter la dictée" : "Démarrer la dictée vocale"}
                >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
            )}
        </div>
    );
};

export default VoiceInput;

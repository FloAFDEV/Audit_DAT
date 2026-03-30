
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';

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

const VoiceInput: React.FC<VoiceInputProps> = ({ value, onChange, placeholder, readOnly, rows = 4 }) => {
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const recognitionRef = useRef<any>(null);
    
    // Utilisation d'une ref pour stocker la valeur actuelle sans déclencher de re-rendu ou de réinitialisation de l'effet
    const valueRef = useRef(value);

    // Met à jour la ref à chaque changement de valeur (frappe clavier)
    useEffect(() => {
        valueRef.current = value;
    }, [value]);

    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            setIsSupported(true);
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognitionRef.current = recognition;
            
            recognition.continuous = true; // Continue d'écouter même après une pause
            recognition.interimResults = true;
            recognition.lang = 'fr-FR';

            recognition.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i] && event.results[i][0] && event.results[i].isFinal) {
                        finalTranscript += event.results[i][0].transcript;
                    }
                }
                
                if (finalTranscript) {
                    // On utilise la valeur courante via la ref pour ne pas écraser ce qui vient d'être tapé
                    const currentValue = valueRef.current;
                    // Ajoute un espace si le champ n'est pas vide et ne finit pas déjà par un espace
                    const separator = currentValue && !currentValue.endsWith(' ') ? ' ' : '';
                    const newValue = `${currentValue}${separator}${finalTranscript}`;
                    
                    onChange(newValue);
                }
            };

            recognition.onend = () => {
                // Si l'utilisateur n'a pas arrêté manuellement (ex: silence prolongé), on met à jour l'état
                // Mais on ne force pas setIsListening(false) ici si on veut que ça reste actif, 
                // cependant pour UX mobile c'est mieux que ça s'arrête visuellement si le moteur coupe.
                setIsListening(false);
            };
            
            recognition.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
            };
        }
        // On retire 'value' et 'onChange' des dépendances pour ne pas réinitialiser le moteur vocal à chaque frappe
    }, []);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            try {
                recognitionRef.current?.start();
                setIsListening(true);
            } catch (error) {
                console.error("Erreur lors du démarrage de la reconnaissance vocale:", error);
                setIsListening(false);
            }
        }
    };

    return (
        <div className="relative">
            <textarea
                rows={rows}
                className="block w-full rounded-lg border-0 bg-white dark:bg-slate-900 px-3 py-2 text-base text-gray-900 dark:text-slate-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-600 placeholder:text-gray-500 dark:placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:focus:ring-indigo-500 leading-6 read-only:bg-slate-100 read-only:dark:bg-slate-800 pr-12"
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
                        ? 'bg-red-500 text-white animate-pulse' 
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
import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  icon?: React.ReactNode;
  mainIcon?: React.ReactNode;
  confirmButtonClass?: string;
  isDestructive?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    icon, 
    mainIcon, 
    confirmButtonClass, 
    isDestructive 
}) => {
    const [confirmationCode, setConfirmationCode] = useState('');
    const [userInput, setUserInput] = useState('');

    useEffect(() => {
        if (isOpen && isDestructive) {
            // Generate a random 4-digit code
            const code = Math.floor(1000 + Math.random() * 9000).toString();
            setConfirmationCode(code);
            setUserInput(''); // Reset user input when modal opens
        }
    }, [isOpen, isDestructive]);


    if (!isOpen) return null;

    const isConfirmationRequired = isDestructive && confirmationCode;
    const isConfirmationMatch = !isConfirmationRequired || userInput === confirmationCode;
    
    const renderMessage = () => {
        const highlightClassName = "font-semibold text-gray-900 dark:text-white";

        return message.split('\n').map((line, index) => {
            if (line.trim() === '') {
                return <br key={index} />;
            }

            const keyValueParts = line.split(/:(.*)/s);
            if (keyValueParts.length > 1 && keyValueParts[1].trim() !== '') {
                return (
                    <p key={index} className="leading-relaxed">
                        {keyValueParts[0]}:
                        <strong className={highlightClassName}>{keyValueParts[1]}</strong>
                    </p>
                );
            }

            const matches: { index: number; text: string }[] = [];

            // Use matchAll to find all non-overlapping matches for a pattern.
            const findMatches = (pattern: RegExp) => {
                for (const match of line.matchAll(pattern)) {
                    // The first capture group is the text to highlight.
                    const textToHighlight = match[1];
                    // The index of the capture group within the original string.
                    const startIndex = match.index != null ? match.index + match[0].indexOf(textToHighlight) : -1;

                    if (textToHighlight && startIndex > -1) {
                         // Check for overlaps. If a new match is inside an existing one, ignore it.
                        const isOverlapping = matches.some(m => 
                            (startIndex >= m.index && startIndex < (m.index + m.text.length)) ||
                            (m.index >= startIndex && m.index < (startIndex + textToHighlight.length))
                        );
                        
                        if (!isOverlapping) {
                            matches.push({ index: startIndex, text: textToHighlight });
                        }
                    }
                }
            };
            
            // Define patterns from most specific to most general to avoid bad overlaps.
            // These patterns should capture ONLY the text to be highlighted.
            findMatches(/pour la catégorie "([^"]+)"/gi);
            findMatches(/pour la station\s+([^?]+)(?=\s*\?)/gi);
            // This is a negative lookbehind to avoid matching "la catégorie" or "la station"
            findMatches(/pour\s+((?!la catégorie|la station)[^?:\n]+)(?=\s*\?)/gi);
            findMatches(/(réinitialiser)/gi);

            if (matches.length === 0) {
                return <p key={index} className="leading-relaxed">{line}</p>;
            }
            
            // Sort matches by index to process the line in order.
            matches.sort((a, b) => a.index - b.index);

            // FIX: Replaced JSX.Element with React.ReactElement to resolve "Cannot find namespace 'JSX'" error.
            const result: (string | React.ReactElement)[] = [];
            let lastIndex = 0;

            matches.forEach((match, matchIndex) => {
                // Add the text before the current match.
                if (match.index > lastIndex) {
                    result.push(line.substring(lastIndex, match.index));
                }
                // Add the highlighted match.
                result.push(<strong key={`${index}-${matchIndex}`} className={highlightClassName}>{match.text}</strong>);
                lastIndex = match.index + match.text.length;
            });

            // Add any remaining text after the last match.
            if (lastIndex < line.length) {
                result.push(line.substring(lastIndex));
            }

            return <p key={index} className="leading-relaxed">{result}</p>;
        });
    };

    return (
        <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75 dark:bg-black/80 transition-opacity z-50 flex items-center justify-center p-4" 
            aria-labelledby="modal-title" 
            role="dialog" 
            aria-modal="true"
            onClick={onClose}
        >
        <div 
            className="relative transform overflow-hidden rounded-lg bg-white dark:bg-slate-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg dark:ring-1 dark:ring-teal-400/70"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="bg-white dark:bg-slate-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
                {mainIcon || (
                    <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 sm:mx-0 sm:h-10 sm:w-10">
                        <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" aria-hidden="true" />
                    </div>
                )}
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                <div className="flex items-center gap-2">
                    {icon}
                    <h3 className="text-lg font-bold leading-6 text-gray-900 dark:text-white" id="modal-title">
                        {title}
                    </h3>
                </div>
                <div className="mt-2">
                    <div className="text-sm text-gray-600 dark:text-slate-300 whitespace-pre-wrap">
                        {renderMessage()}
                    </div>
                    {isConfirmationRequired && (
                        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-lg">
                            <p className="text-sm text-yellow-800 dark:text-yellow-300">
                                Cette action est irréversible, confirmez en tapant le code suivant :
                            </p>
                            <p className="text-center font-mono text-2xl font-bold tracking-widest text-yellow-900 dark:text-yellow-300 my-2">
                                {confirmationCode}
                            </p>
                            <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value.trim())}
                                className="block w-full text-center text-lg font-mono rounded-md border-0 bg-white dark:bg-slate-900 px-3 py-2 text-gray-900 dark:text-slate-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-600 placeholder:text-gray-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-inset focus:ring-indigo-600 dark:focus:ring-indigo-500 leading-6"
                                placeholder="****"
                                maxLength={4}
                                autoComplete="off"
                                autoFocus
                            />
                        </div>
                    )}
                </div>
                </div>
            </div>
            </div>
            <div className="bg-gray-50 dark:bg-slate-800/50 dark:border-t dark:border-slate-700 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
                type="button"
                onClick={onConfirm}
                disabled={!isConfirmationMatch}
                className={confirmButtonClass || "inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"}
            >
                Confirmer
            </button>
            <button
                type="button"
                onClick={onClose}
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-slate-700 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-slate-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-600 hover:bg-gray-50 dark:hover:bg-slate-600 sm:mt-0 sm:w-auto"
            >
                Annuler
            </button>
            </div>
        </div>
        </div>
    );
};

export default ConfirmationModal;
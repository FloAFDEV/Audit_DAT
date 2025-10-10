import React from 'react';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle } from 'lucide-react';

interface ToastContentProps {
    IconComponent: React.ReactNode;
    title: string;
    message: string;
}

const CustomToastContent: React.FC<ToastContentProps> = ({ IconComponent, title, message }) => (
    <div className="max-w-sm w-full bg-white dark:bg-slate-800 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 dark:ring-white/10">
        <div className="p-4 flex items-center gap-4">
            <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center">
                {IconComponent}
            </div>
            <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{title}</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">{message}</p>
            </div>
        </div>
    </div>
);

interface ToastOptions {
    icon: React.ReactNode;
    title: string;
    message: string;
}

/**
 * Affiche un toast qui suit le cycle de vie d'une promesse (chargement, succès, erreur).
 * @param promise - La promesse à suivre.
 * @param loading - Les options d'affichage pour l'état de chargement.
 * @param success - Les options d'affichage pour l'état de succès.
 * @param error - Les options d'affichage pour l'état d'erreur.
 * @param onSuccess - Une fonction de rappel optionnelle à exécuter en cas de succès.
 */
export const showPromiseToast = (
    promise: Promise<any>,
    loading: ToastOptions,
    success: ToastOptions,
    error: ToastOptions,
    onSuccess?: () => void
) => {
    const toastId = toast.custom(() => (
        <CustomToastContent 
            IconComponent={loading.icon}
            title={loading.title}
            message={loading.message}
        />
    ), { duration: Infinity });

    promise.then(() => {
        if (onSuccess) {
            onSuccess();
        }
        toast.custom(() => (
            <CustomToastContent
                IconComponent={success.icon}
                title={success.title}
                message={success.message}
            />
        ), { id: toastId, duration: 4000 });
    }).catch((err) => {
        toast.custom(() => (
            <CustomToastContent
                IconComponent={error.icon}
                title={error.title}
                message={err?.toString().replace("Error: ", "") || error.message}
            />
        ), { id: toastId, duration: 6000 });
    });
};

/**
 * Affiche un simple toast de succès.
 * @param options - Les options d'affichage pour le toast de succès.
 */
export const showSuccessToast = (options: ToastOptions) => {
    toast.custom(
        (t) => (
            <div
                className={`transition-all duration-300 ${
                    t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-12'
                }`}
            >
                <CustomToastContent
                    IconComponent={options.icon}
                    title={options.title}
                    message={options.message}
                />
            </div>
        ),
        { duration: 4000 }
    );
};

/**
 * Affiche un simple toast d'erreur.
 * @param options - Les options d'affichage pour le toast d'erreur.
 */
export const showErrorToast = (options: ToastOptions) => {
    toast.custom(
        (t) => (
            <div
                className={`transition-all duration-300 ${
                    t.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-12'
                }`}
            >
                <CustomToastContent
                    IconComponent={options.icon}
                    title={options.title}
                    message={options.message}
                />
            </div>
        ),
        { duration: 6000 }
    );
};

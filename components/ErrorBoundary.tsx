// components/ErrorBoundary.tsx
// =================================================================
// FILET DE SÉCURITÉ DE RENDU — sans lui, une exception React (donnée
// limite, propriété absente) démonte tout l'arbre et laisse une page
// blanche sans recours, potentiellement en plein audit terrain.
// -----------------------------------------------------------------
// Les données de l'audit en cours sont déjà persistées en continu
// (chaque champ est écrit en base dès sa saisie, cf. store.ts) : cette
// erreur ne concerne que l'AFFICHAGE, jamais les données déjà
// enregistrées. « Retour à l'accueil » réinitialise uniquement l'état
// de navigation (accès direct au store Zustand, hors React puisque ce
// composant est une classe) — rien n'est effacé en base.
// =================================================================
import React from 'react';
import { AlertTriangle, Home } from 'lucide-react';
import useAuditStore from '../store';

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { error: null };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error("Erreur de rendu interceptée par ErrorBoundary :", error, info.componentStack);
    }

    handleReturnHome = () => {
        try {
            useAuditStore.setState({
                selectedLieuId: null, selectedModuleId: null, selectedStationId: null,
                selectedDirectionId: null, selectedDatId: null, selectedPrZoneId: null,
                selectedEquipmentId: null, selectedEcaId: null,
                isStatsViewActive: false, isSignaletiqueActive: false,
                activeFilter: 'ALL', activeAuditFilters: [],
            });
        } catch { /* le store reste dans l'état qu'il pouvait atteindre */ }
        this.setState({ error: null });
    };

    render() {
        if (this.state.error) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center" role="alert">
                    <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-5">
                        <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" aria-hidden="true" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                        Une erreur d'affichage est survenue
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
                        Vos données déjà enregistrées ne sont pas concernées — chaque saisie est sauvegardée
                        immédiatement. Revenez à l'accueil pour poursuivre votre audit.
                    </p>
                    <button
                        onClick={this.handleReturnHome}
                        className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                    >
                        <Home className="h-4 w-4" aria-hidden="true" />
                        Retour à l'accueil
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;

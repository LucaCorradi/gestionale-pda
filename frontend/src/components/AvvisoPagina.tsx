import { Alert, Button } from "@mantine/core"
import WizardStepContainer from "./WizardStepContainer"
import BarraAzioni from "./BarraAzioni"

type AvvisoPaginaProps = {
    title: string
    children?: React.ReactNode
    color?: string
    // Pulsante in fondo per uscire dalla situazione (Riprova, Indietro, Home)
    actionLabel: string
    onAction: () => void
}

/*
    Pagina che non può mostrare il suo contenuto (dati non caricati, elenco vuoto): l'avviso e SEMPRE un pulsante per
    uscirne. Sul palmare la testata con i collegamenti è nascosta: senza pulsante l'operatore resterebbe bloccato.
*/
export default function AvvisoPagina({ title, children, color = "yellow", actionLabel, onAction }: AvvisoPaginaProps) {
    return (
        <WizardStepContainer>
            <div className="area-flessibile">
                <Alert color={color} title={title}>{children}</Alert>
            </div>
            <BarraAzioni>
                <Button onClick={onAction}>{actionLabel}</Button>
            </BarraAzioni>
        </WizardStepContainer>
    )
}

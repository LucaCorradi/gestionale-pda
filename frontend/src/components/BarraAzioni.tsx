import { Group } from "@mantine/core"

/*
    Barra dei pulsanti in fondo alla pagina, uguale ovunque (come NavigationButtons del wizard): pulsanti affiancati della
    stessa larghezza, il secondario (variant="default", es. Indietro / Annulla) a sinistra e il principale a destra.
    Va messa come ultimo elemento dentro WizardStepContainer, dopo l'area flessibile.
*/
export default function BarraAzioni({ children }: { children: React.ReactNode }) {
    return (
        <Group pt="xs" grow gap="xs" wrap="nowrap">
            {children}
        </Group>
    )
}

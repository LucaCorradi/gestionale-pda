import { Center, Stack } from "@mantine/core";

export default function WizardStepContainer({ children }: { children: React.ReactNode }) {
    return (
        <Center py="md" w="100%" h="var(--content-height)">
            {/* contenitore-passo (index.css): con la tastiera aperta si accorcia solo l'elenco, non pulsanti e campi */}
            <Stack h="100%" w="960px" gap={0} className="contenitore-passo">
                {children}
            </Stack>
        </Center>
    )
}
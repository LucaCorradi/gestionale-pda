import { Center, Stack } from "@mantine/core";

export default function WizardStepContainer({ children }: { children: React.ReactNode }) {
    return (
        <Center py="md" w="100%" h="var(--content-height)">
            <Stack h="100%" w="960px" gap={0}>
                {children}
            </Stack>
        </Center>
    )
}
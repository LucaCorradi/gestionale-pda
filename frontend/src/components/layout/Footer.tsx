import { Text, Group } from "@mantine/core"

export default function Footer() {
    return (
        <Group h="100%" px="md" justify="space-between">
            <Text size="sm" c="dimmed">Casa del Formaggio · PDA magazzino</Text>
            <Text size="sm" c="dimmed">v0.1</Text>
        </Group>
    )
}
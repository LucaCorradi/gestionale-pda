import { Text, Group } from "@mantine/core"

export default function Footer() {
    return (
        // Solo da md in su, come la testata: sui palmari il piè di pagina ha altezza 0 e il testo finirebbe sopra la pagina
        <Group h="100%" px="md" justify="space-between" visibleFrom="md">
            <Text size="sm" c="dimmed">Casa del Formaggio · PDA magazzino</Text>
            <Text size="sm" c="dimmed">v0.1</Text>
        </Group>
    )
}
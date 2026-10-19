import { ActionIcon, Button, Group, Stack, Text, TextInput } from "@mantine/core"
import { LuPlus, LuTrash } from "react-icons/lu"
import { selectAllOnClick, selectAllOnFocus } from "../../lib/utils"

// Mezza riga di spazio (circa metà dell'altezza di un campo) tra un alias e l'altro
const ALIAS_GAP_PX = 18

export const MAX_ALIASES = 10

// Codici puliti: senza spazi ai lati e senza righe vuote
export const cleanAliasCodes = (codes: string[]) => codes.map((c) => c.trim()).filter((c) => c.length > 0)

type AliasListFieldsProps = {
    codes: string[]
    onChange: (codes: string[]) => void
}

// Elenco alias modificabile (creazione e modifica articolo): una riga per codice, il cestino tutto a destra.
// Resta sempre almeno una riga: per non avere alias basta lasciarla vuota.
export default function AliasListFields({ codes, onChange }: AliasListFieldsProps) {
    return (
        <Stack gap="xs">
            <Text size="sm" fw={500}>Alias (codici a barre e altri codici, facoltativi)</Text>
            <Stack gap={ALIAS_GAP_PX}>
                {codes.map((code, index) => (
                    <Group key={index} wrap="nowrap" gap="xs">
                        <TextInput
                            flex={1}
                            miw={0}
                            placeholder="Codice"
                            value={code}
                            onChange={(e) => {
                                const value = e.currentTarget.value
                                onChange(codes.map((c, i) => (i === index ? value : c)))
                            }}
                            onFocus={selectAllOnFocus}
                            onClick={selectAllOnClick}
                            maxLength={40}
                        />
                        <ActionIcon
                            variant="light"
                            color="red"
                            size="lg"
                            aria-label="Elimina alias"
                            onClick={() => onChange(codes.length === 1 ? [''] : codes.filter((_, i) => i !== index))}
                        >
                            <LuTrash />
                        </ActionIcon>
                    </Group>
                ))}
            </Stack>
            <Button
                variant="subtle"
                size="xs"
                leftSection={<LuPlus />}
                onClick={() => onChange([...codes, ''])}
                disabled={codes.length >= MAX_ALIASES}
            >
                Aggiungi alias
            </Button>
        </Stack>
    )
}

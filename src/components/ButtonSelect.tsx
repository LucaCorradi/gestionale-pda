import { Button, Group, Input } from "@mantine/core"

type ButtonSelectOption = { value: string, label: string }

type ButtonSelectProps = {
    label: string
    data: ButtonSelectOption[]
    value: string | null
    onChange: (value: string | null) => void
    error?: React.ReactNode
}

// Scelta singola a pulsanti al posto del menu a tendina: sul palmare e' un tocco solo invece di due, e si vedono tutte le voci.
// I pulsanti vanno a capo da soli e si dividono la riga in base alla lunghezza del testo.
export default function ButtonSelect({ label, data, value, onChange, error }: ButtonSelectProps) {
    return (
        <Input.Wrapper label={label} error={error} mt="xs">
            <Group gap={6} mt={4} role="radiogroup" aria-label={label}>
                {data.map((option) => (
                    <Button
                        key={option.value}
                        flex="1 1 auto"
                        maw="100%"
                        variant={value === option.value ? 'filled' : 'default'}
                        onClick={() => onChange(option.value)}
                        role="radio"
                        aria-checked={value === option.value}
                    >
                        {option.label}
                    </Button>
                ))}
            </Group>
        </Input.Wrapper>
    )
}

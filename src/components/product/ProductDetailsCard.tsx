import { Badge, Card, Group, Stack, Text } from "@mantine/core"
import { LuPencil } from "react-icons/lu"
import type { ProductLookupResponse } from "../../schemas/productLookupSchema"

type ProductDetailsCardProps = {
    product: ProductLookupResponse
    // Se presente, toccando la scheda si apre la modifica dei dati
    onEdit?: () => void
}

// Scheda compatta di un articolo di Passepartout: serve solo a riconoscerlo e a controllare i dati, quindi il nome in
// evidenza e tutto il resto in poche righe piccole (deve stare in una schermata senza scorrere).
export default function ProductDetailsCard({ product, onEdit }: ProductDetailsCardProps) {
    const details = [
        `cod. ${product.Code}`,
        product.UnitOfMeasure,
        product.VatRate ? `IVA ${product.VatRate}` : null,
        product.Category ?? 'senza categoria',
        product.Price,
    ].filter(Boolean).join(' · ')

    return (
        <Card withBorder radius="md" p="xs" onClick={onEdit} style={onEdit ? { cursor: 'pointer' } : undefined}>
            <Stack gap={4}>
                <Group justify="space-between" wrap="nowrap" align="flex-start" gap="xs">
                    <Text fw={600} size="sm" lh={1.25} miw={0} style={{ overflowWrap: 'anywhere' }}>{product.Name}</Text>
                    <Group gap={6} wrap="nowrap" style={{ flexShrink: 0 }}>
                        {!product.IsActive && <Badge color="red" variant="light" size="xs">Non attivo</Badge>}
                        {onEdit && <LuPencil size={16} aria-label="Modifica" />}
                    </Group>
                </Group>

                <Text size="xs" c="dimmed">{details}</Text>

                {product.Aliases.length === 0 ? (
                    <Text size="xs" c="dimmed">Nessun alias</Text>
                ) : (
                    <Group gap={4}>
                        {product.Aliases.map((alias) => (
                            <Badge key={`${alias.Code}-${alias.Type}`} variant="outline" size="xs" tt="none">
                                {/* Il tipo si scrive solo quando non e' il solito "Generico" */}
                                {alias.Type === 'Generico' ? alias.Code : `${alias.Code} (${alias.Type})`}
                            </Badge>
                        ))}
                    </Group>
                )}
            </Stack>
        </Card>
    )
}

import { Badge, Card, Group, Stack, Text } from "@mantine/core"
import type { ProductLookupResponse } from "../../schemas/productLookupSchema"

type ProductDetailsCardProps = {
    product: ProductLookupResponse
}

// Scheda compatta di un articolo di Passepartout: serve solo a riconoscerlo e a controllare i dati, quindi il nome in
// evidenza e tutto il resto in poche righe piccole (deve stare in una schermata senza scorrere).
export default function ProductDetailsCard({ product }: ProductDetailsCardProps) {
    const details = [
        `cod. ${product.Code}`,
        product.UnitOfMeasure,
        product.VatRate ? `IVA ${product.VatRate}` : null,
        product.Category ?? 'senza categoria',
        product.Price,
    ].filter(Boolean).join(' · ')

    return (
        <Card withBorder radius="md" p="xs">
            <Stack gap={4}>
                <Group justify="space-between" wrap="nowrap" align="flex-start" gap="xs">
                    <Text fw={600} size="sm" lh={1.25} miw={0} style={{ overflowWrap: 'anywhere' }}>{product.Name}</Text>
                    {!product.IsActive && <Badge color="red" variant="light" size="xs">Non attivo</Badge>}
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

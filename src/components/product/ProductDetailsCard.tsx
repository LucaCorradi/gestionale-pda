import { Badge, Card, Group, Stack, Text } from "@mantine/core"
import type { ProductLookupResponse } from "../../schemas/productLookupSchema"

type ProductDetailsCardProps = {
    product: ProductLookupResponse
}

// Scheda di un articolo di Passepartout: serve a capire "che roba è" prima di usarlo o modificarlo
export default function ProductDetailsCard({ product }: ProductDetailsCardProps) {
    return (
        <Card withBorder radius="md" p="sm">
            <Stack gap="xs">
                <Group justify="space-between" wrap="nowrap" align="flex-start">
                    <Stack gap={0}>
                        <Text size="sm" c="dimmed">Codice {product.Code}</Text>
                        <Text fw={600}>{product.Name}</Text>
                    </Stack>
                    {!product.IsActive && <Badge color="red" variant="light">Non attivo</Badge>}
                </Group>

                <Group gap="xs">
                    <Badge variant="light" color="gray">U.M. {product.UnitOfMeasure}</Badge>
                    {product.VatRate && <Badge variant="light" color="gray">IVA {product.VatRate}</Badge>}
                    <Badge variant="light" color="gray">{product.Category ? `Categoria ${product.Category}` : 'Senza categoria'}</Badge>
                    <Badge variant="light" color="gray">Prezzo {product.Price}</Badge>
                </Group>

                <Stack gap={4}>
                    <Text size="xs" c="dimmed" fw={600}>Alias</Text>
                    {product.Aliases.length === 0 ? (
                        <Text size="sm" c="dimmed">Nessun alias</Text>
                    ) : (
                        <Group gap="xs">
                            {product.Aliases.map((alias) => (
                                <Badge key={`${alias.Code}-${alias.Type}`} variant="outline" tt="none">
                                    {alias.Code} · {alias.Type}
                                </Badge>
                            ))}
                        </Group>
                    )}
                </Stack>
            </Stack>
        </Card>
    )
}

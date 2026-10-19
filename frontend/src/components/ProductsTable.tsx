import { ActionIcon, Card, Divider, Group, NumberInput, Stack, Table, Text } from "@mantine/core"
import { useEffect, useState } from "react"
import type { ProductRow } from "./ProductForm"
import { LuChevronDown, LuChevronUp, LuPencil, LuTrash } from "react-icons/lu"

type ProductsTableProps = {
    products: ProductRow[]
    onEdit?: (index: number) => void
    onDelete?: (index: number) => void
    // Cambio rapido della quantita' dalla scheda aperta (palmare)
    onQuantityChange?: (index: number, quantity: number) => void
}

type MobileRowProps = {
    product: ProductRow
    index: number
    open: boolean
    onToggle: () => void
    onEdit?: (index: number) => void
    onDelete?: (index: number) => void
    onQuantityChange?: (index: number, quantity: number) => void
}

// Scheda di un prodotto sul palmare. Se la lista e' modificabile, toccandola si apre: quantita', matita (modifica completa,
// es. frigorifero) e cestino per toglierlo dal documento.
function MobileRow({ product, index, open, onToggle, onEdit, onDelete, onQuantityChange }: MobileRowProps) {
    const editable = Boolean(onEdit || onDelete || onQuantityChange)

    // Mentre si scrive la quantita' puo' essere vuota o non valida: si aggiorna il documento solo con un numero maggiore di zero
    const [quantity, setQuantity] = useState<number | string>(product.quantity)
    const valid = typeof quantity === 'number' && quantity > 0

    // Se la quantita' cambia da fuori (es. dopo la modifica completa dalla matita) il campo si riallinea
    useEffect(() => {
        setQuantity((current) => (typeof current === 'number' && current === product.quantity ? current : product.quantity))
    }, [product.quantity])

    return (
        <Card withBorder p="xs" onClick={editable ? onToggle : undefined} style={{ cursor: editable ? 'pointer' : 'default' }}>
            <Stack gap={4}>
                <Group justify="space-between" wrap="nowrap" gap="xs">
                    <Text size="sm">{product.code}</Text>
                    <Group gap={6} wrap="nowrap">
                        <Text size="sm">{product.quantity} {product.unitOfMeasure}</Text>
                        {editable && (open ? <LuChevronUp size={16} /> : <LuChevronDown size={16} />)}
                    </Group>
                </Group>
                <Text size="sm" fw={600} style={{ overflowWrap: 'anywhere' }}>{product.name}</Text>
                <Text size="sm">{product.fridgeDescription || '-'}</Text>

                {editable && open && (
                    // I clic sui controlli non devono richiudere la scheda
                    <div onClick={(e) => e.stopPropagation()}>
                        <Divider my={6} />
                        <Group wrap="nowrap" gap="xs">
                            {onQuantityChange && (
                                <NumberInput
                                    aria-label="Quantità"
                                    flex={1}
                                    miw={0}
                                    value={quantity}
                                    onChange={(value) => {
                                        setQuantity(value)
                                        if (typeof value === 'number' && value > 0) onQuantityChange(index, value)
                                    }}
                                    min={0}
                                    allowNegative={false}
                                    allowDecimal
                                    decimalSeparator=","
                                    allowedDecimalSeparators={[",", "."]}
                                    rightSection={<Text size="xs" c="dimmed" pr="xs">{product.unitOfMeasure}</Text>}
                                    rightSectionWidth={40}
                                    error={!valid}
                                />
                            )}
                            {onEdit && (
                                <ActionIcon variant="light" size="lg" aria-label="Modifica" onClick={() => onEdit(index)}>
                                    <LuPencil />
                                </ActionIcon>
                            )}
                            {onDelete && (
                                <ActionIcon variant="light" color="red" size="lg" aria-label="Elimina dal documento" onClick={() => onDelete(index)}>
                                    <LuTrash />
                                </ActionIcon>
                            )}
                        </Group>
                    </div>
                )}
            </Stack>
        </Card>
    )
}

export default function ProductsTable({ products, onEdit, onDelete, onQuantityChange }: ProductsTableProps) {
    const canEdit = Boolean(onEdit)
    const canDelete = Boolean(onDelete)

    // Una sola scheda aperta alla volta (palmare)
    const [openIndex, setOpenIndex] = useState<number | null>(null)

    return (
        <>
        {/* Mobile stack */}
        <Stack hiddenFrom="md">
            {products.map((product, index) => (
                <MobileRow
                    key={`${index}-${product.code}`}
                    product={product}
                    index={index}
                    open={openIndex === index}
                    onToggle={() => setOpenIndex((current) => (current === index ? null : index))}
                    onEdit={onEdit}
                    onDelete={onDelete && ((i) => { setOpenIndex(null); onDelete(i) })}
                    onQuantityChange={onQuantityChange}
                />
            ))}
        </Stack>

        {/* Desktop table */}
        <Table stickyHeader highlightOnHover withRowBorders={false} visibleFrom="md">
            <Table.Thead>
                <Table.Tr>
                    {canEdit && <Table.Th w={0}></Table.Th>}
                    <Table.Th>Codice</Table.Th>
                    <Table.Th>Nome</Table.Th>
                    <Table.Th>Q.tà</Table.Th>
                    <Table.Th>Frigorifero</Table.Th>
                    {canDelete && <Table.Th w={0}></Table.Th>}
                </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
                {products.map((product, index) => (
                    <Table.Tr key={`${product.code}-${product.fridgeUUID}-${index}`} onClick={ canEdit ? () => onEdit?.(index) : undefined } style={{ cursor: canEdit ? 'pointer' : 'default' }}>
                        {canEdit && <Table.Td><LuPencil /></Table.Td>}
                        <Table.Td><Text size="sm">{product.code}</Text></Table.Td>
                        <Table.Td><Text size="sm">{product.name}</Text></Table.Td>
                        <Table.Td><Text size="sm">{product.quantity} {product.unitOfMeasure}</Text></Table.Td>
                        <Table.Td><Text size="sm">{product.fridgeDescription || '-'}</Text></Table.Td>
                        {canDelete && <Table.Td><ActionIcon variant="light" color="red" onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onDelete?.(index)
                        }}><LuTrash /></ActionIcon></Table.Td>}
                    </Table.Tr>
                ))}
            </Table.Tbody>
        </Table>
        </>
    )
}

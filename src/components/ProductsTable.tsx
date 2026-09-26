import { ActionIcon, Card, Group, Stack, Table, Text } from "@mantine/core"
import type { ProductRow } from "./ProductForm"
import { LuPencil, LuTrash } from "react-icons/lu"

type ProductsTableProps = {
    products: ProductRow[]
    onEdit?: (index: number) => void
    onDelete?: (index: number) => void
}

export default function ProductsTable({ products, onEdit, onDelete }: ProductsTableProps) {
    const canEdit = Boolean(onEdit)
    const canDelete = Boolean(onDelete)

    return (
        <>
        {/* Mobile stack */}
        <Stack hiddenFrom="md">
            {products.map((product, index) => (
                <Card key={index} withBorder p="xs">
                    <Stack gap={4}>
                        <Group justify="space-between">
                            <Text size="sm">{product.code}</Text>
                            <Text size="sm">{product.quantity} {product.unitOfMeasure}</Text>
                        </Group>
                        <Text size="sm" fw={600}>{product.name}</Text>
                        <Text size="sm">{product.fridgeDescription || '-'}</Text>
                    </Stack>
                </Card>
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
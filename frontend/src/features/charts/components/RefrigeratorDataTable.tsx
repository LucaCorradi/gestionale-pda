import { Table } from "@mantine/core"
import dayjs from "dayjs"

type RefrigeratorDataTableProps = {
    chartData: (number | null)[][]
    fridgeNames: string[]
}

export default function RefrigeratorDataTable({ chartData, fridgeNames }: RefrigeratorDataTableProps) {
    return (
        <Table.ScrollContainer minWidth={100} maxHeight={600}>
            <Table stickyHeader highlightOnHover>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Data</Table.Th>
                        {fridgeNames.map((name) => (
                            <Table.Th key={name}>{name}</Table.Th>
                        ))}
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {chartData.map((row, rowIndex) => {
                        const [t, ...vals] = row
                        return (
                            <Table.Tr key={rowIndex}>
                                <Table.Td>{Number.isFinite(t) ? dayjs(Number(t)).format('DD/MM/YYYY HH:mm') : '-'}</Table.Td>
                                {vals.map((v, colIndex) => (
                                    <Table.Td key={colIndex}>{v != null ? `${v.toFixed(2)} °C` : '-'}</Table.Td>
                                ))}
                            </Table.Tr>
                        )
                    })}
                </Table.Tbody>
            </Table>
        </Table.ScrollContainer>
    )
}
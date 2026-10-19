import { LineChart } from "@mantine/charts"
import { Badge, Box, Group, Paper, Text } from "@mantine/core"
import dayjs from "dayjs"
import type { TooltipContentProps } from "recharts"
import { getColorFor } from "../../../lib/utils"
import { useElementSize } from "@mantine/hooks"

dayjs.locale('it')

type RefrigeratorDataChartProps = {
    chartData: (number | null)[][]
    fridgeNames: string[]
}

export default function RefrigeratorDataChart({ chartData, fridgeNames }: RefrigeratorDataChartProps) {
    const { ref: chartRef, width } = useElementSize()


    // Chart labels count helpers
    const MIN_TICKS = 4
    const MAX_TICKS = 12
    const MIN_TICK_PX = 100

    const desiredTicks = (() => {
        const w = width || 800
        const n = Math.floor(w / MIN_TICK_PX)
        return Math.max(MIN_TICKS, Math.min(MAX_TICKS, n || MIN_TICKS))
    })()

    const stride = Math.max(1, Math.ceil(chartData.length / desiredTicks))

    const ticks: number[] = []
    for (let i = 0; i < chartData.length; i += stride) {
        ticks.push(Number(chartData[i][0]))
    }

    // Add last label if not present in the calculated array.
    // if (chartData.length && ticks[ticks.length - 1] !== Number(chartData[chartData.length - 1][0])) {
    //     ticks.push(Number(chartData[chartData.length - 1][0]))
    // }




    // Chart data transformation
    const chartObjects = chartData.map((row) => {
        const [t, ...vals] = row
        const obj: Record<string, number | null> = { t: Number(t) }
        fridgeNames.forEach((name, idx) => {
            obj[name] = (vals[idx] ?? null) as number | null
        })
        return obj
    })

    const series = fridgeNames.map((name) => ({ name, color: getColorFor(name) }))


    const ChartTooltip = ({ active, label, payload }: TooltipContentProps<number, string>) => {
        if (!active || !payload || !payload.length) return null

        const ts = Number(label)
        const when = Number.isFinite(ts) ? dayjs(ts).format('DD/MM/YYYY HH:mm') : String(label)

        return (
            <Paper px="md" py="sm" withBorder shadow="md" radius="md">
                <Text fw={500} mb={5}>{when}</Text>
                {payload.map((p) => (
                    <Group key={p.dataKey as string} wrap="nowrap" align="center">
                        <Badge color={getColorFor(p.name ?? '')} variant="dot">{p.name}</Badge>
                        <Text>{`${(p.value as number).toFixed(1)} °C`}</Text>
                    </Group>
                ))}
            </Paper>
        )
    }


    return (
        <Box ref={chartRef}>
            <LineChart
                h={600}
                data={chartObjects}
                dataKey="t"
                series={series}
                connectNulls={false}
                withDots={false}
                lineProps={{ isAnimationActive: false }}
                xAxisProps={{
                    type: 'number',
                    domain: ['dataMin', 'dataMax'],
                    ticks,
                    tickFormatter: (ts) => dayjs(ts).format('DD/MM HH:mm'),
                    interval: 0,
                    angle: -45,
                    tickMargin: 25
                }}
                valueFormatter={(v) => (v == null ? '-' : `${v.toFixed(1)} °C`)}
                tooltipProps={{ content: (props) => <ChartTooltip {...props} /> }}
                withLegend
            />
        </Box>
    )
}
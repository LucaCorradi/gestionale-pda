import { Box, Card, Center, Stack, Tabs, Text } from "@mantine/core"
import { useEffect, useState } from "react"
import { LuChartLine, LuTableProperties } from "react-icons/lu"
import { httpPost } from "../../../lib/api"
import { showError } from "../../../lib/utils"
import dayjs from 'dayjs'
import 'dayjs/locale/it'
import { fridgeChartRequestSchema, fridgeChartResponseSchema, type FridgeChart, type FridgeChartRequest } from "../../../schemas/fridgeChartSchema"
import CustomSpinner from "../../../components/CustomSpinner"
import { useDispatch } from "react-redux"
import { reset } from "../../wizard/wizardSlice"
import RefrigeratorDataChart from "../components/RefrigeratorDataChart"
import RefrigeratorDataTable from "../components/RefrigeratorDataTable"
import RefrigeratorDataFilters from "../components/RefrigeratorDataFilters"
import type { ChartFiltersSnapshot } from "../../../schemas/utils"

dayjs.locale('it')

type ChartMatrixRow = (number | null)[]

export default function RefrigeratorData() {
    const dispatch = useDispatch()
    const [activeTab, setActiveTab] = useState<string | null>('chart')

    // Chart state
    const [chartData, setChartData] = useState<ChartMatrixRow[] | null>(null)
    const [fridgeNames, setFridgeNames] = useState<string[] | null>(null)
    const [loadingChart, setLoadingChart] = useState<boolean>(false)

    // Cleanup store status
    useEffect(() => {
        dispatch(reset())
    }, [dispatch])

    // Request data
    const handleSubmit = async (snap: ChartFiltersSnapshot) => {
        if (!snap.isReady) return

        try {
            setLoadingChart(true)
            setChartData([])

            const payload: FridgeChartRequest = fridgeChartRequestSchema.parse({
                ProductCode: snap.productCode,
                FromDate: new Date(snap.from!).toISOString(),
                ToDate: new Date(snap.to!).toISOString(),
            })

            const raw = await httpPost('/fridges/chart', payload)
            const resp = fridgeChartResponseSchema.parse(raw) as FridgeChart

            // Set chart data
            setFridgeNames(resp.Metadata?.FridgeNames ?? [])
            setChartData(resp.Data ?? [])

        } catch (e) {
            showError({ title: 'Errore durante il caricamento dei dati del grafico', error: e })
            setChartData([])
        } finally {
            setLoadingChart(false)
        }
    }

    return (
        <Box py="md">
            <Stack>
                <Card withBorder>
                    <RefrigeratorDataFilters loading={loadingChart} onSubmitRequested={handleSubmit} />
                </Card>

                {loadingChart ? (
                    <CustomSpinner h={600} />
                ) : !chartData || !fridgeNames ? (
                    <Card withBorder h={600} shadow="sm">
                        <Center h="100%">
                            <Text c="dimmed">Aggiorna il grafico per visualizzare i dati</Text>
                        </Center>
                    </Card>
                ) : !chartData.length || !fridgeNames.length ? (
                    <Card withBorder h={600} shadow="sm">
                        <Center h="100%">
                            <Text c="dimmed">Nessun dato trovato per questo prodotto e questo range di date.</Text>
                        </Center>
                    </Card>
                ) : (
                    <Tabs value={activeTab} onChange={setActiveTab}>
                        <Tabs.List>
                            <Tabs.Tab value="chart" leftSection={<LuChartLine />}>Grafico</Tabs.Tab>
                            <Tabs.Tab value="table" leftSection={<LuTableProperties />}>Tabella</Tabs.Tab>
                        </Tabs.List>
                        <Tabs.Panel value="chart">
                            {activeTab === 'chart' && ( // Workaround for reCharts "width = 0" warning
                                <RefrigeratorDataChart chartData={chartData} fridgeNames={fridgeNames} />
                            )}
                        </Tabs.Panel>
                        <Tabs.Panel value="table">
                            {activeTab === 'table' && (
                                <RefrigeratorDataTable chartData={chartData} fridgeNames={fridgeNames} />
                            )}
                        </Tabs.Panel>
                    </Tabs>
                )}
            </Stack>
        </Box>
    )
}
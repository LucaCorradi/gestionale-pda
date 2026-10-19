import { ActionIcon, Button, Flex, TextInput } from "@mantine/core"
import { DatePickerInput } from "@mantine/dates"
import { useState } from "react"
import { LuEye, LuSearchCheck } from "react-icons/lu"
import { productLookupRequestSchema, productLookupResponseSchema, type ProductLookupRequest, type ProductLookupResponse } from "../../../schemas/productLookupSchema"
import { httpPost } from "../../../lib/api"
import { showError } from "../../../lib/utils"
import dayjs from "dayjs"
import type { ChartFiltersSnapshot } from "../../../schemas/utils"

dayjs.locale('it')

type RefrigeratorDatFiltersProps = {
    loading: boolean
    onSubmitRequested?: (s: ChartFiltersSnapshot) => void
}

export default function RefrigeratorDataFilters({ loading, onSubmitRequested }: RefrigeratorDatFiltersProps) {

    const [productInput, setProductInput] = useState<string>('')
    const [lookupOk, setLookupOk] = useState<boolean>(false)
    const [isLookingUp, setIsLookingUp] = useState<boolean>(false)

    const [productCode, setProductCode] = useState<string>('')
    const [productName, setProductName] = useState<string>('')

    const [dates, setDates] = useState<[string | null, string | null]>([null, null])

    // Product lookup
    const doLookup = async () => {
        const alias = productInput.trim()
        if (!alias) return

        try {
            setIsLookingUp(true)
            setLookupOk(false)

            const body: ProductLookupRequest = productLookupRequestSchema.parse({ Alias: alias })
            const raw = await httpPost('/products/lookup', body)
            const data = productLookupResponseSchema.parse(raw) as ProductLookupResponse

            setProductCode(data.Code)
            setProductName(data.Name)
            setLookupOk(true)
        } catch (e) {
            setProductCode('')
            setProductName('')
            setLookupOk(false)
            showError({ title: 'Prodotto non trovato o errore di rete', error: e })
        } finally {
            setIsLookingUp(false)
        }
    }


    const isReady = Boolean(lookupOk && dates[0] && dates[1])
    const snapshot: ChartFiltersSnapshot = {
        productCode: lookupOk ? productCode : null,
        from: dates[0],
        to: dates[1],
        isReady
    }


    return (
        <Flex direction={{ base: 'column', md: 'row' }} align={{ base: "stretch", md: 'end' }} gap="md" wrap="nowrap">

            {/* Product input */}
            <TextInput
                label="Prodotto"
                placeholder="Prodotto..."
                value={productInput}
                onChange={(e) => {
                    setProductInput(e.currentTarget.value)
                    setLookupOk(false)
                }}
                onBlur={doLookup}
                onKeyDown={async (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault()
                        e.stopPropagation()
                        await doLookup()
                    }
                }}
                rightSection={
                    <ActionIcon onClick={doLookup} type="button" loading={isLookingUp} disabled={!productInput}>
                        <LuSearchCheck />
                    </ActionIcon>
                }
            />

            {/* Lookup */}
            <TextInput label="Nome prodotto" placeholder="-" value={lookupOk ? `${productCode} - ${productName}` : ''} readOnly miw={320} />

            {/* Date range */}
            <DatePickerInput
                label="Date"
                type="range"
                placeholder="Seleziona un range di date"
                numberOfColumns={2}
                miw={320}
                value={dates}
                onChange={setDates}
                locale="it"
                valueFormat="DD MMMM YYYY"
                allowSingleDateInRange
                maxDate={new Date()}
            />

            {/* Submit */}
            <Button leftSection={<LuEye />} onClick={() => isReady && onSubmitRequested?.(snapshot)} loading={loading} disabled={!isReady || loading}>Aggiorna grafico</Button>

        </Flex>
    )
}
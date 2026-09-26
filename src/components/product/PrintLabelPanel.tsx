import { Button, Card, Group, NumberInput, Stack, Text } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { useState } from "react"
import { LuPrinter } from "react-icons/lu"
import { httpPost } from "../../lib/api"
import { showError } from "../../lib/utils"
import type { ProductLookupResponse } from "../../schemas/productLookupSchema"
import { productPrintLabelRequestSchema, productPrintLabelResponseSchema } from "../../schemas/productManageSchema"

type PrintLabelPanelProps = {
    product: ProductLookupResponse
}

const MAX_COPIES = 100

// Stampa delle etichette barcode (EAN-8) per i prodotti che non ne hanno uno. Il barcode è ricavato dal codice interno.
export default function PrintLabelPanel({ product }: PrintLabelPanelProps) {
    const [copies, setCopies] = useState<number | string>(1)
    const [printing, setPrinting] = useState(false)

    const copiesNumber = typeof copies === 'number' ? copies : Number(copies)
    const validCopies = Number.isInteger(copiesNumber) && copiesNumber >= 1 && copiesNumber <= MAX_COPIES

    const handlePrint = async () => {
        if (!validCopies) return

        try {
            setPrinting(true)

            const body = productPrintLabelRequestSchema.parse({ Code: product.Code, Copies: copiesNumber })
            const raw = await httpPost('/products/print-label', body)
            const result = productPrintLabelResponseSchema.parse(raw)

            notifications.show({
                title: 'Etichette inviate alla stampante',
                message: `${result.Copies} × ${result.Barcode}`,
                color: 'green'
            })
        } catch (e: any) {
            showError({ title: 'Errore durante la stampa delle etichette', error: e })
        } finally {
            setPrinting(false)
        }
    }

    return (
        <Card withBorder radius="md" p="sm">
            <Stack gap="xs">
                <Text size="xs" c="dimmed" fw={600}>Etichetta barcode</Text>

                {product.LabelBarcode ? (
                    <>
                        <Text size="sm">Barcode EAN-8: <b>{product.LabelBarcode}</b></Text>
                        <Group wrap="nowrap" align="flex-end">
                            <NumberInput
                                label="Quantità etichette"
                                w={140}
                                value={copies}
                                onChange={setCopies}
                                min={1}
                                max={MAX_COPIES}
                                allowDecimal={false}
                                allowNegative={false}
                                error={validCopies ? undefined : `Da 1 a ${MAX_COPIES}`}
                            />
                            <Button flex={1} leftSection={<LuPrinter />} onClick={handlePrint} loading={printing} disabled={!validCopies}>
                                Stampa etichetta
                            </Button>
                        </Group>
                    </>
                ) : (
                    <Text size="sm" c="dimmed">
                        Non disponibile: il codice {product.Code} non è di 5 cifre numeriche (per esempio gli articoli a peso), quindi non si può ricavare il barcode.
                    </Text>
                )}
            </Stack>
        </Card>
    )
}

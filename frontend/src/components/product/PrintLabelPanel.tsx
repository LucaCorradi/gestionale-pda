import { Button, Group, NumberInput, Text } from "@mantine/core"
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

// Riga compatta per stampare le etichette barcode (EAN-8) di un prodotto: quantita' e pulsante. Il numero del barcode
// non si mostra: all'operatore non serve e ruba spazio (lo calcola il backend dal codice interno).
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
                message: `${result.Copies} × ${product.Name}`,
                color: 'green'
            })
        } catch (e: any) {
            showError({ title: 'Errore durante la stampa delle etichette', error: e })
        } finally {
            setPrinting(false)
        }
    }

    if (!product.LabelBarcode) {
        return (
            <Text size="xs" c="dimmed">
                Etichetta non disponibile: il codice {product.Code} non è di 5 cifre (es. articoli a peso).
            </Text>
        )
    }

    return (
        <Group wrap="nowrap" gap="xs">
            <NumberInput
                aria-label="Numero di etichette"
                w={92}
                prefix="× "
                value={copies}
                onChange={setCopies}
                min={1}
                max={MAX_COPIES}
                allowDecimal={false}
                allowNegative={false}
                hideControls
                error={!validCopies}
            />
            <Button flex={1} miw={0} leftSection={<LuPrinter />} onClick={handlePrint} loading={printing} disabled={!validCopies}>
                Stampa etichetta
            </Button>
        </Group>
    )
}

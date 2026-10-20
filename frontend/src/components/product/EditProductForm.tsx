import { Alert, Button, Group, Loader, ScrollArea, Stack, Text } from "@mantine/core"
import { useState } from "react"
import { httpPost } from "../../lib/api"
import { showError } from "../../lib/utils"
import { productLookupResponseSchema, type ProductLookupResponse } from "../../schemas/productLookupSchema"
import { productUpdateRequestSchema } from "../../schemas/productManageSchema"
import AliasListFields, { cleanAliasCodes } from "./AliasListFields"
import ProductDataFields, { parsePrice, useProductCatalog, type ProductData } from "./ProductDataFields"

type EditProductFormProps = {
    product: ProductLookupResponse
    onSaved: (product: ProductLookupResponse) => void
    onCancel: () => void
}

// Modifica dei dati principali e degli alias di un articolo esistente. L'unità di misura non si tocca:
// cambiarla a un articolo già movimentato e' compito dell'ufficio.
// Gli alias esistenti mantengono il loro tipo, quelli nuovi sono di tipo "Generico" come nella creazione.
export default function EditProductForm({ product, onSaved, onCancel }: EditProductFormProps) {
    const { catalog, error: catalogError } = useProductCatalog()

    const [data, setData] = useState<ProductData>({
        name: product.Name,
        price: product.SalePrice,
        vat: product.VatRate,
        categoryCode: product.CategoryCode
    })
    // Lo stesso codice può comparire due volte con tipi diversi: nel form basta una riga
    const [aliases, setAliases] = useState<string[]>(() => {
        const codes = [...new Set(product.Aliases.map((a) => a.Code))]
        return codes.length > 0 ? codes : ['']
    })
    const [formError, setFormError] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    if (catalogError) {
        return (
            <Stack>
                <Alert color="red" title="Impossibile caricare gli elenchi">{catalogError}</Alert>
                <Button variant="default" onClick={onCancel}>Chiudi</Button>
            </Stack>
        )
    }

    if (!catalog) {
        return (
            <Stack align="center" py="md">
                <Loader />
                <Text size="sm" c="dimmed">Caricamento...</Text>
            </Stack>
        )
    }

    const handleSubmit = async () => {
        setFormError(null)

        const price = parsePrice(data.price)
        const cleanAliases = cleanAliasCodes(aliases)

        if (data.name.trim().length < 2) return setFormError('Inserisci la descrizione del prodotto')
        if (!data.vat) return setFormError("Seleziona l'aliquota IVA")
        if (price === null || Number.isNaN(price)) return setFormError('Inserisci il prezzo (0 se non impostato)')
        if (new Set(cleanAliases).size !== cleanAliases.length) return setFormError('Ci sono alias ripetuti')

        try {
            setSubmitting(true)

            const body = productUpdateRequestSchema.parse({
                Code: product.Code,
                Name: data.name,
                VatRate: data.vat,
                CategoryCode: data.categoryCode,
                SalePrice: price,
                Aliases: cleanAliases
            })
            const raw = await httpPost('/products/update', body)
            onSaved(productLookupResponseSchema.parse(raw))
        } catch (e: any) {
            if (e?.name === 'ApiError' && (e.status === 409 || e.status === 400)) {
                setFormError(e.message)
            } else {
                showError({ title: 'Errore durante la modifica del prodotto', error: e })
            }
        } finally {
            setSubmitting(false)
        }
    }

    // Tutto il modulo è l'area flessibile della pagina: dentro, i campi scorrono e i pulsanti restano in fondo
    return (
        <Stack gap="xs" className="area-flessibile">
            <Text size="xs" c="dimmed">Modifica articolo {product.Code} · {product.UnitOfMeasure}</Text>

            <ScrollArea type="always" offsetScrollbars flex={1} mih={0}>
                <Stack gap="xs">
                    <ProductDataFields catalog={catalog} value={data} onChange={(patch) => setData((prev) => ({ ...prev, ...patch }))} />
                    <AliasListFields codes={aliases} onChange={setAliases} />
                </Stack>
            </ScrollArea>

            {formError && <Alert color="red" p="xs">{formError}</Alert>}

            <Group grow>
                <Button variant="default" onClick={onCancel} disabled={submitting}>Annulla</Button>
                <Button onClick={handleSubmit} loading={submitting}>Salva</Button>
            </Group>
        </Stack>
    )
}

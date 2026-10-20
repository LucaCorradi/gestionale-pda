import { Alert, Button, Group, Loader, ScrollArea, SegmentedControl, Stack, Text } from "@mantine/core"
import { useState } from "react"
import { httpPost } from "../../lib/api"
import { showError } from "../../lib/utils"
import { productLookupResponseSchema, type ProductLookupResponse } from "../../schemas/productLookupSchema"
import { productCreateRequestSchema } from "../../schemas/productManageSchema"
import AliasListFields, { cleanAliasCodes } from "./AliasListFields"
import ProductDataFields, { parsePrice, useProductCatalog, type ProductData } from "./ProductDataFields"

type CreateProductFormProps = {
    // Alias già digitato dall'operatore (quello per cui il prodotto non è stato trovato)
    initialAlias?: string
    onCreated: (product: ProductLookupResponse) => void
    onCancel: () => void
}

// Dal palmare gli alias sono sempre di tipo "Generico" (e' quello usato anche per i codici a barre): il tipo non si sceglie
const ALIAS_TYPE = 'Generico'

// Form compatto per creare un articolo: niente titoli ne' etichette dove il campo si capisce da solo (segnaposto, pulsanti).
// Prezzo, categoria e alias sono facoltativi: quello che manca lo completa l'ufficio in Passepartout.
// Occupa l'altezza che gli viene data: i campi scorrono e i pulsanti Annulla / Crea prodotto restano in fondo.
export default function CreateProductForm({ initialAlias, onCreated, onCancel }: CreateProductFormProps) {
    const { catalog, error: catalogError } = useProductCatalog()

    const [data, setData] = useState<ProductData>({ name: '', price: '', vat: null, categoryCode: null })
    const [unit, setUnit] = useState('pz')
    const [aliases, setAliases] = useState<string[]>([initialAlias ?? ''])

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

        const cleanAliases = cleanAliasCodes(aliases).map((code) => ({ Code: code, Type: ALIAS_TYPE }))
        const price = parsePrice(data.price)

        if (data.name.trim().length < 2) return setFormError('Inserisci la descrizione del prodotto')
        if (!data.vat) return setFormError("Seleziona l'aliquota IVA")
        if (Number.isNaN(price)) return setFormError('Prezzo non valido')
        if (new Set(cleanAliases.map((a) => a.Code)).size !== cleanAliases.length) return setFormError('Ci sono alias ripetuti')

        try {
            setSubmitting(true)

            const body = productCreateRequestSchema.parse({
                Name: data.name,
                UnitOfMeasure: unit,
                VatRate: data.vat,
                CategoryCode: data.categoryCode,
                SalePrice: price,
                Aliases: cleanAliases
            })
            const raw = await httpPost('/products/create', body)
            const product = productLookupResponseSchema.parse(raw)

            onCreated(product)
        } catch (e: any) {
            // Errori attesi (alias già usato, descrizione doppia...) restano nel form, gli altri come notifica
            if (e?.name === 'ApiError' && (e.status === 409 || e.status === 400)) {
                setFormError(e.message)
            } else {
                showError({ title: 'Errore durante la creazione del prodotto', error: e })
            }
        } finally {
            setSubmitting(false)
        }
    }

    // Tutto il modulo è l'area flessibile della pagina: dentro, i campi scorrono e i pulsanti restano in fondo
    return (
        <Stack gap="xs" className="area-flessibile">
            <ScrollArea type="always" offsetScrollbars flex={1} mih={0}>
                <Stack gap="xs">
                    <ProductDataFields catalog={catalog} value={data} onChange={(patch) => setData((prev) => ({ ...prev, ...patch }))} />

                    <SegmentedControl fullWidth aria-label="Unità di misura" value={unit} onChange={setUnit} data={catalog.UnitsOfMeasure} />

                    <AliasListFields codes={aliases} onChange={setAliases} />
                </Stack>
            </ScrollArea>

            {formError && <Alert color="red" p="xs">{formError}</Alert>}

            <Group grow>
                <Button variant="default" onClick={onCancel} disabled={submitting}>Annulla</Button>
                <Button onClick={handleSubmit} loading={submitting}>Crea prodotto</Button>
            </Group>
        </Stack>
    )
}

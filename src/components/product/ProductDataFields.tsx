import { Button, Group, NumberInput, Select, TextInput } from "@mantine/core"
import { useEffect, useState } from "react"
import { httpGet } from "../../lib/api"
import { productCatalogResponseSchema, type ProductCatalogResponse } from "../../schemas/productManageSchema"

// Dati principali di un articolo, comuni a creazione e modifica
export type ProductData = {
    name: string
    // stringa vuota = prezzo non indicato
    price: number | string
    vat: string | null
    categoryCode: string | null
}

// Elenchi per i form (IVA, unità di misura, categorie). Appena riavviato il backend le categorie possono richiedere
// qualche secondo: il backend aspetta il primo caricamento degli articoli da Passepartout.
export function useProductCatalog() {
    const [catalog, setCatalog] = useState<ProductCatalogResponse | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false

        httpGet('/products/catalog')
            .then((raw) => { if (!cancelled) setCatalog(productCatalogResponseSchema.parse(raw)) })
            .catch((e: any) => { if (!cancelled) setError(e?.message ?? 'Errore durante il caricamento degli elenchi') })

        return () => { cancelled = true }
    }, [])

    return { catalog, error }
}

// Prezzo dal campo: null se vuoto, altrimenti arrotondato ai centesimi
export const parsePrice = (price: number | string): number | null => {
    if (price === '' || price === null) return null
    const value = typeof price === 'number' ? price : Number(String(price).replace(',', '.'))
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : NaN
}

type ProductDataFieldsProps = {
    catalog: ProductCatalogResponse
    value: ProductData
    onChange: (patch: Partial<ProductData>) => void
}

// Campi compatti per il palmare: niente etichette dove il segnaposto basta
export default function ProductDataFields({ catalog, value, onChange }: ProductDataFieldsProps) {
    // Le categorie sono un albero: si mostra "MADRE › CATEGORIA" per distinguere quelle con lo stesso nome
    const categories = catalog.Categories.map((c) => ({
        value: c.Code,
        label: c.ParentDescription ? `${c.ParentDescription} › ${c.Description}` : c.Description
    })).sort((a, b) => a.label.localeCompare(b.label, 'it'))

    return (
        <>
            <TextInput
                aria-label="Descrizione"
                placeholder="PRODUTTORE - PRODOTTO"
                value={value.name}
                onChange={(e) => onChange({ name: e.currentTarget.value })}
                maxLength={80}
                data-autofocus
            />

            <NumberInput
                aria-label="Prezzo di vendita IVA inclusa"
                placeholder="Prezzo vendita IVA incl."
                leftSection="€"
                value={value.price}
                onChange={(price) => onChange({ price })}
                min={0}
                max={99999}
                decimalScale={2}
                decimalSeparator=","
                allowNegative={false}
                hideControls
                inputMode="decimal"
            />

            {/* Aliquota IVA: pulsanti che vanno a capo da soli (5 voci non stanno su una riga sul palmare) */}
            <Group gap={6} role="radiogroup" aria-label="Aliquota IVA">
                {catalog.VatRates.map((rate) => (
                    <Button
                        key={rate}
                        size="compact-sm"
                        flex="1 1 auto"
                        variant={value.vat === rate ? 'filled' : 'default'}
                        onClick={() => onChange({ vat: rate })}
                        role="radio"
                        aria-checked={value.vat === rate}
                    >
                        {rate}
                    </Button>
                ))}
            </Group>

            <Select
                aria-label="Categoria"
                placeholder={categories.length > 0 ? 'Categoria (facoltativa)' : 'Categorie non disponibili'}
                data={categories}
                value={value.categoryCode}
                onChange={(categoryCode) => onChange({ categoryCode })}
                disabled={categories.length === 0}
                searchable
                clearable
                nothingFoundMessage="Nessuna categoria"
                maxDropdownHeight={220}
            />
        </>
    )
}

import { ActionIcon, Alert, Button, Group, Loader, ScrollArea, SegmentedControl, Stack, Text, TextInput } from "@mantine/core"
import { useEffect, useState } from "react"
import { LuPlus, LuTrash } from "react-icons/lu"
import { httpGet, httpPost } from "../../lib/api"
import { selectAllOnClick, selectAllOnFocus, showError } from "../../lib/utils"
import { productLookupResponseSchema, type ProductLookupResponse } from "../../schemas/productLookupSchema"
import { productCatalogResponseSchema, productCreateRequestSchema, type ProductCatalogResponse } from "../../schemas/productManageSchema"

type CreateProductFormProps = {
    // Alias già digitato dall'operatore (quello per cui il prodotto non è stato trovato)
    initialAlias?: string
    onCreated: (product: ProductLookupResponse) => void
    onCancel: () => void
}

type AliasRow = { code: string }

// Dal palmare gli alias sono sempre di tipo "Generico" (e' quello usato anche per i codici a barre): il tipo non si sceglie
const ALIAS_TYPE = 'Generico'

// Mezza riga di spazio (circa metà dell'altezza di un campo) tra un alias e l'altro
const ALIAS_GAP_PX = 18

// Form compatto per creare un articolo: niente titoli ne' etichette dove il campo si capisce da solo (segnaposto, pulsanti).
// Prezzo e categoria non si chiedono: li imposta l'ufficio in Passepartout.
// Occupa l'altezza che gli viene data: i campi scorrono e i pulsanti Annulla / Crea prodotto restano in fondo.
export default function CreateProductForm({ initialAlias, onCreated, onCancel }: CreateProductFormProps) {
    const [catalog, setCatalog] = useState<ProductCatalogResponse | null>(null)
    const [catalogError, setCatalogError] = useState<string | null>(null)

    const [name, setName] = useState('')
    const [unit, setUnit] = useState('pz')
    const [vat, setVat] = useState<string | null>(null)
    const [aliases, setAliases] = useState<AliasRow[]>([{ code: initialAlias ?? '' }])

    const [formError, setFormError] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    // Elenchi (IVA, unità di misura, tipi di alias)
    useEffect(() => {
        let cancelled = false

        const load = async () => {
            try {
                const raw = await httpGet('/products/catalog')
                const data = productCatalogResponseSchema.parse(raw)
                if (!cancelled) setCatalog(data)
            } catch (e: any) {
                if (!cancelled) setCatalogError(e?.message ?? 'Errore durante il caricamento degli elenchi')
            }
        }
        load()

        return () => { cancelled = true }
    }, [])

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

    const updateAlias = (index: number, patch: Partial<AliasRow>) => {
        setAliases((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)))
    }

    const handleSubmit = async () => {
        setFormError(null)

        const cleanAliases = aliases.map((a) => ({ Code: a.code.trim(), Type: ALIAS_TYPE })).filter((a) => a.Code.length > 0)

        if (name.trim().length < 2) return setFormError('Inserisci la descrizione del prodotto')
        if (!vat) return setFormError("Seleziona l'aliquota IVA")
        if (cleanAliases.length === 0) return setFormError('Inserisci almeno un alias')
        if (new Set(cleanAliases.map((a) => a.Code)).size !== cleanAliases.length) return setFormError('Ci sono alias ripetuti')

        try {
            setSubmitting(true)

            const body = productCreateRequestSchema.parse({
                Name: name,
                UnitOfMeasure: unit,
                VatRate: vat,
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

    return (
        <Stack h="100%" gap="xs">
            <ScrollArea type="auto" flex={1} mih={0}>
                <Stack gap="xs">
                    <TextInput
                        aria-label="Descrizione"
                        placeholder="PRODUTTORE - PRODOTTO"
                        value={name}
                        onChange={(e) => setName(e.currentTarget.value)}
                        maxLength={80}
                        data-autofocus
                    />

                    <SegmentedControl fullWidth aria-label="Unità di misura" value={unit} onChange={setUnit} data={catalog.UnitsOfMeasure} />

                    {/* Aliquota IVA: pulsanti che vanno a capo da soli (5 voci non stanno su una riga sul palmare) */}
                    <Group gap={6} role="radiogroup" aria-label="Aliquota IVA">
                        {catalog.VatRates.map((rate) => (
                            <Button
                                key={rate}
                                size="compact-sm"
                                flex="1 1 auto"
                                variant={vat === rate ? 'filled' : 'default'}
                                onClick={() => setVat(rate)}
                                role="radio"
                                aria-checked={vat === rate}
                            >
                                {rate}
                            </Button>
                        ))}
                    </Group>

                    <Stack gap="xs">
                        <Text size="sm" fw={500}>Alias (codici a barre e altri codici)</Text>
                        {/* Una riga per alias: il codice occupa lo spazio e il cestino sta tutto a destra */}
                        <Stack gap={ALIAS_GAP_PX}>
                            {aliases.map((alias, index) => (
                                <Group key={index} wrap="nowrap" gap="xs">
                                    <TextInput
                                        flex={1}
                                        miw={0}
                                        placeholder="Codice"
                                        value={alias.code}
                                        onChange={(e) => updateAlias(index, { code: e.currentTarget.value })}
                                        onFocus={selectAllOnFocus}
                                        onClick={selectAllOnClick}
                                        maxLength={40}
                                    />
                                    <ActionIcon
                                        variant="light"
                                        color="red"
                                        size="lg"
                                        aria-label="Elimina alias"
                                        disabled={aliases.length === 1}
                                        onClick={() => setAliases((prev) => prev.filter((_, i) => i !== index))}
                                    >
                                        <LuTrash />
                                    </ActionIcon>
                                </Group>
                            ))}
                        </Stack>
                        <Button
                            variant="subtle"
                            size="xs"
                            leftSection={<LuPlus />}
                            onClick={() => setAliases((prev) => [...prev, { code: '' }])}
                            disabled={aliases.length >= 10}
                        >
                            Aggiungi alias
                        </Button>
                    </Stack>
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

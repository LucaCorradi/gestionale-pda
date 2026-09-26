import { ActionIcon, Alert, Button, Group, Loader, NativeSelect, SegmentedControl, Stack, Text, TextInput } from "@mantine/core"
import { useEffect, useState } from "react"
import { LuPlus, LuTrash } from "react-icons/lu"
import { httpGet, httpPost } from "../../lib/api"
import { showError } from "../../lib/utils"
import { CustomSelect } from "../CustomSelect"
import { productLookupResponseSchema, type ProductLookupResponse } from "../../schemas/productLookupSchema"
import { productCatalogResponseSchema, productCreateRequestSchema, type ProductCatalogResponse } from "../../schemas/productManageSchema"

type CreateProductFormProps = {
    // Alias già digitato dall'operatore (quello per cui il prodotto non è stato trovato)
    initialAlias?: string
    onCreated: (product: ProductLookupResponse) => void
    onCancel: () => void
}

type AliasRow = { code: string, type: string }

const DEFAULT_ALIAS_TYPE = 'Generico'

export default function CreateProductForm({ initialAlias, onCreated, onCancel }: CreateProductFormProps) {
    const [catalog, setCatalog] = useState<ProductCatalogResponse | null>(null)
    const [catalogError, setCatalogError] = useState<string | null>(null)

    const [name, setName] = useState('')
    const [unit, setUnit] = useState('pz')
    const [vat, setVat] = useState<string | null>(null)
    const [category, setCategory] = useState<string | null>(null)
    const [aliases, setAliases] = useState<AliasRow[]>([{ code: initialAlias ?? '', type: DEFAULT_ALIAS_TYPE }])

    const [formError, setFormError] = useState<string | null>(null)
    const [submitting, setSubmitting] = useState(false)

    // Elenchi (IVA, categorie, unità di misura): al primo utilizzo dopo l'avvio del server possono servire alcuni secondi
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
                <Text size="sm" c="dimmed">Caricamento elenchi da Passepartout...</Text>
            </Stack>
        )
    }

    const categoryOptions = catalog.Categories
        .map((c) => ({ value: c.Code, label: c.ParentDescription ? `${c.ParentDescription} › ${c.Description}` : c.Description }))
        .sort((a, b) => a.label.localeCompare(b.label, 'it'))

    const updateAlias = (index: number, patch: Partial<AliasRow>) => {
        setAliases((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)))
    }

    const handleSubmit = async () => {
        setFormError(null)

        const cleanAliases = aliases.map((a) => ({ Code: a.code.trim(), Type: a.type })).filter((a) => a.Code.length > 0)

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
                CategoryCode: category,
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
        <Stack gap="sm">
            <TextInput
                label="Descrizione"
                placeholder="PRODUTTORE - PRODOTTO"
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
                maxLength={80}
                data-autofocus
            />

            <Stack gap={4}>
                <Text size="sm" fw={500}>Unità di misura</Text>
                <SegmentedControl fullWidth value={unit} onChange={setUnit} data={catalog.UnitsOfMeasure} />
            </Stack>

            <CustomSelect
                label="Aliquota IVA"
                data={catalog.VatRates}
                value={vat}
                onChange={setVat}
                clearable={false}
                comboboxProps={{ keepMounted: false }}
            />

            <CustomSelect
                label="Categoria"
                description="Facoltativa"
                data={categoryOptions}
                value={category}
                onChange={setCategory}
                comboboxProps={{ keepMounted: false }}
            />

            <Stack gap="xs">
                <Text size="sm" fw={500}>Alias (codici a barre e altri codici)</Text>
                {aliases.map((alias, index) => (
                    <Group key={index} wrap="nowrap" align="flex-end" gap="xs">
                        <TextInput
                            flex={1}
                            placeholder="Codice"
                            value={alias.code}
                            onChange={(e) => updateAlias(index, { code: e.currentTarget.value })}
                            maxLength={40}
                        />
                        <NativeSelect
                            w={120}
                            value={alias.type}
                            onChange={(e) => updateAlias(index, { type: e.currentTarget.value })}
                            data={catalog.AliasTypes}
                        />
                        <ActionIcon
                            variant="light"
                            color="red"
                            size="lg"
                            disabled={aliases.length === 1}
                            onClick={() => setAliases((prev) => prev.filter((_, i) => i !== index))}
                        >
                            <LuTrash />
                        </ActionIcon>
                    </Group>
                ))}
                <Button
                    variant="subtle"
                    size="xs"
                    leftSection={<LuPlus />}
                    onClick={() => setAliases((prev) => [...prev, { code: '', type: DEFAULT_ALIAS_TYPE }])}
                    disabled={aliases.length >= 10}
                >
                    Aggiungi alias
                </Button>
            </Stack>

            <Text size="xs" c="dimmed">Il prezzo resta a zero: lo imposterà l'ufficio in Passepartout. Il codice prodotto viene assegnato in automatico.</Text>

            {formError && <Alert color="red">{formError}</Alert>}

            <Group grow>
                <Button variant="default" onClick={onCancel} disabled={submitting}>Annulla</Button>
                <Button onClick={handleSubmit} loading={submitting}>Crea prodotto</Button>
            </Group>
        </Stack>
    )
}

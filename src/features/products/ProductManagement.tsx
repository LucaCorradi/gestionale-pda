import { ActionIcon, Alert, Badge, Button, Card, Divider, Group, Loader, NativeSelect, ScrollArea, Stack, Text, TextInput } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { useState } from "react"
import { LuChevronLeft, LuSearch } from "react-icons/lu"
import { useNavigate } from "react-router-dom"
import CreateProductForm from "../../components/product/CreateProductForm"
import PrintLabelPanel from "../../components/product/PrintLabelPanel"
import ProductDetailsCard from "../../components/product/ProductDetailsCard"
import WizardStepContainer from "../../components/WizardStepContainer"
import { httpGet, httpPost } from "../../lib/api"
import { selectAllOnClick, selectAllOnFocus, showError } from "../../lib/utils"
import { productLookupRequestSchema, productLookupResponseSchema, type ProductLookupResponse } from "../../schemas/productLookupSchema"
import {
    productAddAliasRequestSchema, productByCodeRequestSchema, productCatalogResponseSchema, productSearchRequestSchema, productSearchResponseSchema,
    type ProductSearchResponse
} from "../../schemas/productManageSchema"
import { z } from "zod"

/*
    Gestione prodotti:
    1. si cerca per alias (codice a barre o altro codice)
    2. se esiste si mostra la scheda
    3. se non esiste si cerca per descrizione e si sceglie: aggiungere l'alias a un articolo esistente oppure crearne uno nuovo
*/
type Stage = 'idle' | 'found' | 'notFound' | 'creating'

const isApiError = (e: any, status: number) => e?.name === 'ApiError' && e.status === status

export default function ProductManagement() {
    const navigate = useNavigate()

    const [aliasInput, setAliasInput] = useState('')
    const [alias, setAlias] = useState('')          // alias effettivamente cercato
    const [stage, setStage] = useState<Stage>('idle')
    const [busy, setBusy] = useState(false)

    const [product, setProduct] = useState<ProductLookupResponse | null>(null)

    // Ricerca per descrizione
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<ProductSearchResponse[] | null>(null)
    const [selected, setSelected] = useState<ProductLookupResponse | null>(null)
    const [aliasType, setAliasType] = useState('Generico')
    const [aliasTypes, setAliasTypes] = useState<string[]>(['Generico'])

    const resetSearch = () => {
        setQuery('')
        setResults(null)
        setSelected(null)
        setAliasType('Generico')
    }

    const lookup = async () => {
        const parsed = productLookupRequestSchema.safeParse({ Alias: aliasInput })
        if (!parsed.success) return

        try {
            setBusy(true)
            setAlias(parsed.data.Alias)
            resetSearch()

            const raw = await httpPost('/products/lookup', parsed.data)
            setProduct(productLookupResponseSchema.parse(raw))
            setStage('found')
        } catch (e: any) {
            if (isApiError(e, 404)) {
                setProduct(null)
                setStage('notFound')
                loadAliasTypes()
            } else {
                showError({ title: 'Errore durante la ricerca del prodotto', error: e })
            }
        } finally {
            setBusy(false)
        }
    }

    // I tipi di alias arrivano da Passepartout; se non si caricano resta "Generico"
    const loadAliasTypes = async () => {
        try {
            const raw = await httpGet('/products/catalog')
            setAliasTypes(productCatalogResponseSchema.parse(raw).AliasTypes)
        } catch {
            // non bloccante
        }
    }

    const search = async () => {
        const parsed = productSearchRequestSchema.safeParse({ Query: query })
        if (!parsed.success) return

        try {
            setBusy(true)
            setSelected(null)

            const raw = await httpPost('/products/search', parsed.data)
            setResults(z.array(productSearchResponseSchema).parse(raw))
        } catch (e: any) {
            showError({ title: 'Errore durante la ricerca per descrizione', error: e })
        } finally {
            setBusy(false)
        }
    }

    const select = async (code: string) => {
        try {
            setBusy(true)

            const body = productByCodeRequestSchema.parse({ Code: code })
            const raw = await httpPost('/products/by-code', body)
            setSelected(productLookupResponseSchema.parse(raw))
        } catch (e: any) {
            showError({ title: "Errore durante la lettura dell'articolo", error: e })
        } finally {
            setBusy(false)
        }
    }

    const addAlias = async () => {
        if (!selected) return

        try {
            setBusy(true)

            const body = productAddAliasRequestSchema.parse({ Code: selected.Code, AliasCode: alias, AliasType: aliasType })
            const raw = await httpPost('/products/add-alias', body)
            const updated = productLookupResponseSchema.parse(raw)

            notifications.show({ title: 'Alias aggiunto', message: `${alias} → ${updated.Name}`, color: 'green' })
            setProduct(updated)
            setStage('found')
        } catch (e: any) {
            showError({ title: "Errore durante l'aggiunta dell'alias", error: e })
        } finally {
            setBusy(false)
        }
    }

    const handleCreated = (created: ProductLookupResponse) => {
        notifications.show({ title: 'Prodotto creato', message: `Codice ${created.Code} - ${created.Name}`, color: 'green' })
        setProduct(created)
        setStage('found')
    }

    const startNewSearch = () => {
        setAliasInput('')
        setAlias('')
        setProduct(null)
        resetSearch()
        setStage('idle')
    }

    return (
        <WizardStepContainer>
            <Text fw={500} c="dimmed">Gestione prodotti</Text>

            <ScrollArea type="always" offsetScrollbars flex={1}>
                <Stack pt="md" gap="md">

                    {stage === 'creating' ? (
                        <Stack>
                            <Text fw={600}>Nuovo prodotto</Text>
                            <CreateProductForm initialAlias={alias} onCreated={handleCreated} onCancel={() => setStage('notFound')} />
                        </Stack>
                    ) : (
                        <>
                            <TextInput
                                label="Alias, codice o barcode etichetta"
                                placeholder="Scansiona o digita il codice"
                                value={aliasInput}
                                onChange={(e) => setAliasInput(e.currentTarget.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        lookup()
                                    }
                                }}
                                // Al tocco si seleziona tutto: la scansione successiva sovrascrive il codice precedente
                                onFocus={selectAllOnFocus}
                                onClick={selectAllOnClick}
                                maxLength={40}
                                autoFocus
                                rightSection={
                                    <ActionIcon onClick={lookup} type="button" loading={busy && stage !== 'notFound'} disabled={!aliasInput.trim()}>
                                        <LuSearch />
                                    </ActionIcon>
                                }
                            />

                            {stage === 'found' && product && (
                                <Stack>
                                    <ProductDetailsCard product={product} />
                                    <PrintLabelPanel key={product.Code} product={product} />
                                    <Button variant="default" onClick={startNewSearch}>Nuova ricerca</Button>
                                </Stack>
                            )}

                            {stage === 'notFound' && (
                                <Stack>
                                    <Alert color="yellow" title="Prodotto non trovato">
                                        Nessun articolo ha l'alias <b>{alias}</b>.
                                    </Alert>

                                    <Divider label="Cerca per descrizione" labelPosition="left" />

                                    <TextInput
                                        placeholder="Parte del nome, es. bollinger cuvee"
                                        value={query}
                                        onChange={(e) => setQuery(e.currentTarget.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                search()
                                            }
                                        }}
                                        maxLength={60}
                                        rightSection={
                                            <ActionIcon onClick={search} type="button" disabled={query.trim().length < 2}>
                                                <LuSearch />
                                            </ActionIcon>
                                        }
                                    />

                                    {busy && !selected && results === null && <Loader size="sm" />}

                                    {results !== null && results.length === 0 && (
                                        <Text size="sm" c="dimmed">Nessun articolo trovato con questa descrizione.</Text>
                                    )}

                                    {results !== null && results.length > 0 && (
                                        <Stack gap="xs">
                                            {results.map((r) => (
                                                <Card
                                                    key={r.Code}
                                                    withBorder
                                                    p="xs"
                                                    onClick={() => select(r.Code)}
                                                    style={{ cursor: 'pointer', borderColor: selected?.Code === r.Code ? 'var(--mantine-primary-color-filled)' : undefined }}
                                                >
                                                    <Group justify="space-between" wrap="nowrap">
                                                        <Stack gap={0}>
                                                            <Text size="sm" fw={600}>{r.Name}</Text>
                                                            <Text size="xs" c="dimmed">Codice {r.Code}</Text>
                                                        </Stack>
                                                        {!r.IsActive && <Badge color="red" variant="light">Non attivo</Badge>}
                                                    </Group>
                                                </Card>
                                            ))}
                                        </Stack>
                                    )}

                                    {selected && (
                                        <Stack>
                                            <ProductDetailsCard product={selected} />
                                            <PrintLabelPanel key={selected.Code} product={selected} />
                                            <Group wrap="nowrap" align="flex-end">
                                                <NativeSelect
                                                    label="Tipo alias"
                                                    w={140}
                                                    value={aliasType}
                                                    onChange={(e) => setAliasType(e.currentTarget.value)}
                                                    data={aliasTypes}
                                                />
                                                <Button flex={1} onClick={addAlias} loading={busy}>
                                                    Aggiungi alias {alias} a questo articolo
                                                </Button>
                                            </Group>
                                        </Stack>
                                    )}

                                    <Divider label="Oppure" labelPosition="center" />

                                    <Button variant="light" onClick={() => setStage('creating')} disabled={busy}>
                                        Crea un nuovo articolo con alias {alias}
                                    </Button>
                                </Stack>
                            )}
                        </>
                    )}
                </Stack>
            </ScrollArea>

            <Group pt="md">
                <Button variant="default" leftSection={<LuChevronLeft />} onClick={() => navigate('/')}>Torna alla home</Button>
            </Group>
        </WizardStepContainer>
    )
}

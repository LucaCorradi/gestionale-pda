import { ActionIcon, Alert, Badge, Button, Card, Group, Loader, NativeSelect, ScrollArea, SegmentedControl, Stack, Text, TextInput } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { useState } from "react"
import { LuChevronLeft, LuChevronsUpDown, LuSearch } from "react-icons/lu"
import { useNavigate } from "react-router-dom"
import { z } from "zod"
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

/*
    Gestione prodotti, in due sezioni separate:
    - Per codice: si cerca per alias / codice / barcode etichetta e compare la scheda con il pulsante di stampa etichetta.
      Se non esiste si puo' cercare per descrizione (per associargli l'alias) oppure creare l'articolo.
    - Per descrizione: campo di ricerca e lista completa dei risultati (scorrevole). Scelto un prodotto la lista sparisce e
      restano il suo nome e la stampa; toccando il nome la lista ricompare per cambiare prodotto.
      Se si arriva da un codice non trovato si puo' aggiungere quell'alias all'articolo scelto.
    Tutto compatto: pensato per lo schermo piccolo del palmare.
*/
type Section = 'code' | 'description'
type CodeStatus = 'idle' | 'found' | 'notFound'

const isApiError = (e: any, status: number) => e?.name === 'ApiError' && e.status === status

export default function ProductManagement() {
    const navigate = useNavigate()

    const [section, setSection] = useState<Section>('code')
    const [creating, setCreating] = useState(false)
    const [busy, setBusy] = useState(false)

    // Sezione "per codice"
    const [aliasInput, setAliasInput] = useState('')
    const [codeStatus, setCodeStatus] = useState<CodeStatus>('idle')
    const [product, setProduct] = useState<ProductLookupResponse | null>(null)
    // Alias cercato e non trovato: e' quello che si associa a un articolo esistente o al nuovo articolo
    const [pendingAlias, setPendingAlias] = useState<string | null>(null)

    // Sezione "per descrizione"
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<ProductSearchResponse[] | null>(null)
    const [selected, setSelected] = useState<ProductLookupResponse | null>(null)
    const [aliasType, setAliasType] = useState('Generico')
    const [aliasTypes, setAliasTypes] = useState<string[]>(['Generico'])

    const resetDescription = () => {
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
            resetDescription()

            const raw = await httpPost('/products/lookup', parsed.data)
            setProduct(productLookupResponseSchema.parse(raw))
            setPendingAlias(null)
            setCodeStatus('found')
        } catch (e: any) {
            if (isApiError(e, 404)) {
                setProduct(null)
                setPendingAlias(parsed.data.Alias)
                setCodeStatus('notFound')
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

    // Dopo aver associato l'alias o creato l'articolo si torna alla sezione "per codice" con la scheda del prodotto
    const showFound = (found: ProductLookupResponse) => {
        setProduct(found)
        setCodeStatus('found')
        setPendingAlias(null)
        resetDescription()
        setCreating(false)
        setSection('code')
    }

    const addAlias = async () => {
        if (!selected || !pendingAlias) return

        try {
            setBusy(true)

            const body = productAddAliasRequestSchema.parse({ Code: selected.Code, AliasCode: pendingAlias, AliasType: aliasType })
            const raw = await httpPost('/products/add-alias', body)
            const updated = productLookupResponseSchema.parse(raw)

            notifications.show({ title: 'Alias aggiunto', message: `${pendingAlias} → ${updated.Name}`, color: 'green' })
            showFound(updated)
        } catch (e: any) {
            showError({ title: "Errore durante l'aggiunta dell'alias", error: e })
        } finally {
            setBusy(false)
        }
    }

    const handleCreated = (created: ProductLookupResponse) => {
        notifications.show({ title: 'Prodotto creato', message: `Codice ${created.Code} - ${created.Name}`, color: 'green' })
        showFound(created)
    }

    // Creazione: occupa tutta la schermata; i pulsanti Annulla / Crea prodotto stanno in fondo allo schermo
    if (creating) {
        return (
            <WizardStepContainer>
                <CreateProductForm initialAlias={pendingAlias ?? ''} onCreated={handleCreated} onCancel={() => setCreating(false)} />
            </WizardStepContainer>
        )
    }

    return (
        <WizardStepContainer>
            <SegmentedControl
                fullWidth
                value={section}
                onChange={(value) => setSection(value as Section)}
                data={[{ label: 'Per codice', value: 'code' }, { label: 'Per descrizione', value: 'description' }]}
            />

            {section === 'code' && (
                <ScrollArea type="auto" flex={1} mt="xs">
                    <Stack gap="xs">
                        <TextInput
                            aria-label="Alias, codice o barcode etichetta"
                            placeholder="Scansiona o digita il codice"
                            value={aliasInput}
                            onChange={(e) => {
                                setAliasInput(e.currentTarget.value)
                                // Un nuovo codice nasconde il risultato precedente
                                setCodeStatus('idle')
                                setProduct(null)
                            }}
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
                                <ActionIcon onClick={lookup} type="button" loading={busy} disabled={!aliasInput.trim()}>
                                    <LuSearch />
                                </ActionIcon>
                            }
                        />

                        {codeStatus === 'found' && product && (
                            <>
                                {/* Stampa in alto: e' quello che serve di piu' */}
                                <PrintLabelPanel key={product.Code} product={product} />
                                <ProductDetailsCard product={product} />
                            </>
                        )}

                        {codeStatus === 'notFound' && (
                            <>
                                <Alert color="yellow" title="Prodotto non trovato" p="xs" />
                                <Group grow gap="xs">
                                    <Button variant="default" onClick={() => setSection('description')}>Per descrizione</Button>
                                    <Button onClick={() => setCreating(true)}>Crea nuovo</Button>
                                </Group>
                            </>
                        )}
                    </Stack>
                </ScrollArea>
            )}

            {section === 'description' && (
                // Colonna che occupa lo schermo: il campo in alto e la lista che riempie lo spazio e scorre
                <Stack flex={1} mih={0} mt="xs" gap="xs">
                    {pendingAlias && (
                        <Text size="xs" c="dimmed" style={{ overflowWrap: 'anywhere' }}>Alias da associare: <b>{pendingAlias}</b></Text>
                    )}

                    {selected ? (
                        <>
                            {/* Prodotto scelto: restano nome e stampa. Toccando il nome ricompare la lista per cambiare scelta */}
                            <Card withBorder p="xs" onClick={() => setSelected(null)} style={{ cursor: 'pointer', borderColor: 'var(--mantine-primary-color-filled)' }}>
                                <Group justify="space-between" wrap="nowrap" gap="xs">
                                    <Text size="sm" fw={600} lh={1.25} miw={0} style={{ overflowWrap: 'anywhere' }}>
                                        {selected.Name} <Text span size="xs" c="dimmed" fw={400}>· {selected.Code}</Text>
                                    </Text>
                                    <LuChevronsUpDown size={18} style={{ flexShrink: 0 }} />
                                </Group>
                            </Card>

                            <PrintLabelPanel key={selected.Code} product={selected} />

                            {pendingAlias && (
                                <Stack gap="xs">
                                    <NativeSelect
                                        aria-label="Tipo alias"
                                        value={aliasType}
                                        onChange={(e) => setAliasType(e.currentTarget.value)}
                                        data={aliasTypes}
                                    />
                                    <Button onClick={addAlias} loading={busy}>Aggiungi l'alias a questo articolo</Button>
                                </Stack>
                            )}
                        </>
                    ) : (
                        <>
                            <TextInput
                                aria-label="Descrizione"
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
                                autoFocus
                                rightSection={
                                    <ActionIcon onClick={search} type="button" disabled={query.trim().length < 2}>
                                        <LuSearch />
                                    </ActionIcon>
                                }
                            />

                            {busy && results === null && <Loader size="sm" />}

                            {results !== null && results.length === 0 && (
                                <Text size="sm" c="dimmed">Nessun articolo trovato.</Text>
                            )}

                            {results !== null && results.length > 0 && (
                                <ScrollArea type="auto" flex={1} mih={0}>
                                    <Stack gap={6}>
                                        {results.map((r) => (
                                            <Card key={r.Code} withBorder p="xs" onClick={() => select(r.Code)} style={{ cursor: 'pointer' }}>
                                                <Group justify="space-between" wrap="nowrap" gap="xs">
                                                    <Text size="sm" fw={600} lh={1.25} miw={0} style={{ overflowWrap: 'anywhere' }}>
                                                        {r.Name} <Text span size="xs" c="dimmed" fw={400}>· {r.Code}</Text>
                                                    </Text>
                                                    {!r.IsActive && <Badge color="red" variant="light" size="xs">Non attivo</Badge>}
                                                </Group>
                                            </Card>
                                        ))}
                                    </Stack>
                                </ScrollArea>
                            )}

                            {/* Nessun risultato adatto: si puo' creare l'articolo con l'alias non trovato */}
                            {pendingAlias && (
                                <Button variant="light" onClick={() => setCreating(true)} disabled={busy}>Crea nuovo articolo</Button>
                            )}
                        </>
                    )}
                </Stack>
            )}

            <Group pt="xs">
                <Button variant="default" leftSection={<LuChevronLeft />} onClick={() => navigate('/')}>Torna alla home</Button>
            </Group>
        </WizardStepContainer>
    )
}

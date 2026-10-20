import { ActionIcon, Alert, Button, Group, Modal, NumberInput, Stack, Text } from "@mantine/core"
import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { LuPencil, LuTrash2 } from "react-icons/lu"
import { z } from "zod"
import { ApiError, httpGet, httpPost } from "../../lib/api"
import { showError } from "../../lib/utils"
import { productLookupResponseSchema } from "../../schemas/productLookupSchema"
import ButtonSelect from "../../components/ButtonSelect"
import CustomSpinner from "../../components/CustomSpinner"
import WizardStepContainer from "../../components/WizardStepContainer"
import AreaScorrevole from "../../components/AreaScorrevole"
import BarraAzioni from "../../components/BarraAzioni"
import CampoDaSparare from "../../components/CampoDaSparare"

/*
    Inventario parziale: si sceglie magazzino e operatore, si sparano gli articoli contati (quantità di serie 1; per tanti
    pezzi uguali si scrive il numero e si spara una volta), si guarda il riepilogo e si conferma. Passepartout viene portato
    alle quantità contate; gli articoli non sparati non cambiano. Il conteggio resta salvato nel palmare (localStorage) finché
    non si conferma o si annulla: chiudere la pagina o spegnere il palmare non lo perde.
*/

type CountedRow = { code: string; name: string; unitOfMeasure: string; quantity: number }
type Saved = { warehouse: string | null; employee: string | null; rows: CountedRow[]; started: boolean }
type ReviewRow = { Code: string; Counted: number; Current: number; Difference: number }

const STORAGE_KEY = "pda-inventario"
const empty: Saved = { warehouse: null, employee: null, rows: [], started: false }

const setupSchema = z.object({
    Warehouses: z.array(z.object({ Name: z.string() })),
    Employees: z.array(z.object({ ID: z.number(), EmployeeName: z.string() }))
})
const reviewSchema = z.array(z.object({ Code: z.string(), Counted: z.number(), Current: z.number(), Difference: z.number() }))
const confirmSchema = z.object({ Number: z.number().nullable(), Date: z.string(), Rows: reviewSchema })

// localStorage può essere bloccato (finestra privata): il conteggio dura allora finché la pagina resta aperta
const load = (): Saved => {
    try { return { ...empty, ...JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") } } catch { return empty }
}
const save = (value: Saved) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)) } catch { /* pazienza */ }
}

const qty = (n: number) => n.toLocaleString("it-IT", { maximumFractionDigits: 3 })
const signed = (n: number) => (n > 0 ? "+" : "") + qty(n)

export default function Inventory() {
    const navigate = useNavigate()
    const [state, setState] = useState<Saved>(load)
    const [setup, setSetup] = useState<z.infer<typeof setupSchema> | null>(null)
    const [scan, setScan] = useState("")
    const [quantity, setQuantity] = useState<number | string>(1)
    const [lookingUp, setLookingUp] = useState(false)
    const [editing, setEditing] = useState<CountedRow | null>(null)
    const [editQuantity, setEditQuantity] = useState<number | string>(0)
    const [review, setReview] = useState<ReviewRow[] | null>(null)
    const [busy, setBusy] = useState(false)
    const [done, setDone] = useState<z.infer<typeof confirmSchema> | null>(null)
    const scanRef = useRef<HTMLInputElement>(null)

    const update = (next: Saved) => { setState(next); save(next) }

    useEffect(() => {
        httpGet("/inventory/setup")
            .then((raw) => setSetup(setupSchema.parse(raw)))
            .catch((e) => showError({ title: "Errore nel caricamento di magazzini e operatori", error: e }))
    }, [])

    // Dopo ogni sparo il cursore torna sul campo codice, pronto per il prossimo
    useEffect(() => { if (state.started && !review && !lookingUp) scanRef.current?.focus() }, [state.started, review, lookingUp, state.rows])

    const addScan = async () => {
        const value = scan.trim()
        if (!value || lookingUp) return
        const typed = typeof quantity === "number" ? quantity : Number(String(quantity).replace(",", "."))
        if (!(typed > 0)) { showError({ title: "Quantità non valida", showUser: true }); return }

        setLookingUp(true)
        try {
            const product = productLookupResponseSchema.parse(await httpPost("/products/lookup", { Alias: value }))
            // Barcode a peso variabile: la quantità è nell'etichetta
            const amount = product.Quantity ?? typed
            const existing = state.rows.find((r) => r.code === product.Code)
            const row: CountedRow = existing
                ? { ...existing, quantity: Math.round((existing.quantity + amount) * 1000) / 1000 }
                : { code: product.Code, name: product.Name, unitOfMeasure: product.UnitOfMeasure, quantity: amount }
            // L'ultimo sparato va in cima
            update({ ...state, rows: [row, ...state.rows.filter((r) => r.code !== product.Code)] })
            setScan("")
            setQuantity(1)
        } catch (e) {
            showError({ title: e instanceof ApiError && e.status === 404 ? `Nessun articolo per "${value}"` : "Errore nella ricerca dell'articolo", error: e })
            scanRef.current?.select()
        } finally {
            setLookingUp(false)
        }
    }

    const saveEdit = () => {
        if (!editing) return
        const value = typeof editQuantity === "number" ? editQuantity : Number(String(editQuantity).replace(",", "."))
        if (!(value >= 0)) return
        update({ ...state, rows: state.rows.map((r) => (r.code === editing.code ? { ...r, quantity: value } : r)) })
        setEditing(null)
    }

    const products = () => state.rows.map((r) => ({ Code: r.code, Quantity: r.quantity }))

    const openReview = async () => {
        setBusy(true)
        try {
            setReview(reviewSchema.parse(await httpPost("/inventory/preview", { Warehouse: state.warehouse, Products: products() })))
        } catch (e) {
            showError({ title: "Errore nella lettura delle giacenze", error: e })
        } finally {
            setBusy(false)
        }
    }

    const confirm = async () => {
        setBusy(true)
        try {
            setDone(confirmSchema.parse(await httpPost("/inventory/confirm", { Warehouse: state.warehouse, EmployeeName: state.employee, Products: products() })))
            update(empty)
            setReview(null)
        } catch (e) {
            showError({ title: "Errore nella conferma dell'inventario", error: e })
        } finally {
            setBusy(false)
        }
    }

    const cancel = () => {
        if (state.rows.length && !window.confirm("Annullare l'inventario? Il conteggio fatto finora si perde.")) return
        update(empty)
        setReview(null)
    }

    const nameOf = (code: string) => state.rows.find((r) => r.code === code)
    const changes = review?.filter((r) => r.Difference !== 0) ?? []

    if (!setup) return <CustomSpinner />

    // ---------- Fatto ----------
    if (done) {
        return (
            <WizardStepContainer>
                <AreaScorrevole>
                    <Alert color="green" title={done.Number ? `Inventario n. ${done.Number} in Passepartout` : "Nessuna differenza, nessun documento"}>
                        {done.Rows.length} articoli contati, {done.Rows.filter((r) => r.Difference !== 0).length} con differenze
                    </Alert>
                </AreaScorrevole>
                <BarraAzioni>
                    <Button variant="default" onClick={() => navigate("/")}>Home</Button>
                    <Button onClick={() => setDone(null)}>Nuovo inventario</Button>
                </BarraAzioni>
            </WizardStepContainer>
        )
    }

    // ---------- Scelta di magazzino e operatore ----------
    if (!state.started) {
        return (
            <WizardStepContainer>
                <Text fw={500} c="dimmed">Inventario: scegli magazzino e operatore</Text>
                <AreaScorrevole>
                    <ButtonSelect label="Magazzino" data={setup.Warehouses.map((w) => ({ value: w.Name, label: w.Name }))} value={state.warehouse} onChange={(v) => update({ ...state, warehouse: v })} />
                    <ButtonSelect label="Operatore" data={setup.Employees.map((e) => ({ value: e.EmployeeName, label: e.EmployeeName }))} value={state.employee} onChange={(v) => update({ ...state, employee: v })} />
                </AreaScorrevole>
                <BarraAzioni>
                    <Button variant="default" onClick={() => navigate("/")}>Indietro</Button>
                    <Button disabled={!state.warehouse || !state.employee} onClick={() => update({ ...state, started: true })}>Inizia</Button>
                </BarraAzioni>
            </WizardStepContainer>
        )
    }

    // ---------- Riepilogo prima della conferma ----------
    if (review) {
        return (
            <WizardStepContainer>
                <Text fw={500}>Riepilogo · {state.warehouse}</Text>
                {/* Schermo stretto: niente tabella a colonne, una riga per articolo su due livelli (vedi CLAUDE.md, palmari) */}
                <AreaScorrevole mt="xs">
                    <Stack gap={6}>
                        {review.map((r) => (
                            <div key={r.Code} className="riga-elenco">
                                <Text size="sm" lineClamp={1}>{r.Code} {nameOf(r.Code)?.name}</Text>
                                <Group justify="space-between" wrap="nowrap" gap="xs">
                                    <Text size="sm" c="dimmed">{qty(r.Counted)} {nameOf(r.Code)?.unitOfMeasure} · era {qty(r.Current)}</Text>
                                    <Text size="sm" fw={600} c={r.Difference < 0 ? "red" : r.Difference > 0 ? "green" : "dimmed"}>{r.Difference === 0 ? "=" : signed(r.Difference)}</Text>
                                </Group>
                            </div>
                        ))}
                    </Stack>
                </AreaScorrevole>
                <BarraAzioni>
                    <Button variant="default" disabled={busy} onClick={() => setReview(null)}>Indietro</Button>
                    <Button loading={busy} onClick={confirm}>{changes.length ? `Conferma (${changes.length})` : "Conferma"}</Button>
                </BarraAzioni>
            </WizardStepContainer>
        )
    }

    // ---------- Conteggio ----------
    return (
        <WizardStepContainer>
            <Text fw={500}>Inventario · {state.warehouse}</Text>
            <Group align="flex-end" gap="xs" wrap="nowrap">
                <NumberInput label="Quantità" w={110} value={quantity} onChange={setQuantity} min={0} decimalScale={3} decimalSeparator="," allowNegative={false} />
                <CampoDaSparare
                    ref={scanRef}
                    label="Codice"
                    placeholder="Spara o scrivi il codice"
                    flex={1}
                    value={scan}
                    disabled={lookingUp}
                    onChange={(e) => setScan(e.currentTarget.value)}
                    onScan={() => void addScan()}
                />
            </Group>
            <AreaScorrevole mt="xs">
                {state.rows.length === 0 && <Text c="dimmed" size="sm">Nessun articolo contato</Text>}
                <Stack gap={4}>
                    {state.rows.map((r) => (
                        <Group key={r.code} gap="xs" wrap="nowrap" justify="space-between" className="riga-elenco">
                            <Text size="sm" lineClamp={2}><b>{qty(r.quantity)} {r.unitOfMeasure}</b> {r.code} {r.name}</Text>
                            <Group gap={2} wrap="nowrap">
                                <ActionIcon variant="subtle" aria-label="Correggi quantità" onClick={() => { setEditing(r); setEditQuantity(r.quantity) }}><LuPencil /></ActionIcon>
                                <ActionIcon variant="subtle" color="red" aria-label="Togli" onClick={() => update({ ...state, rows: state.rows.filter((x) => x.code !== r.code) })}><LuTrash2 /></ActionIcon>
                            </Group>
                        </Group>
                    ))}
                </Stack>
            </AreaScorrevole>
            <BarraAzioni>
                <Button variant="default" onClick={cancel}>Annulla</Button>
                <Button disabled={!state.rows.length} loading={busy} onClick={openReview}>Riepilogo ({state.rows.length})</Button>
            </BarraAzioni>

            <Modal opened={!!editing} onClose={() => setEditing(null)} title={editing ? `${editing.code} ${editing.name}` : ""} centered>
                <NumberInput label={`Quantità contata (${editing?.unitOfMeasure ?? ""})`} value={editQuantity} onChange={setEditQuantity} min={0} decimalScale={3} decimalSeparator="," allowNegative={false} data-autofocus />
                <Button mt="md" fullWidth onClick={saveEdit}>Salva</Button>
            </Modal>
        </WizardStepContainer>
    )
}

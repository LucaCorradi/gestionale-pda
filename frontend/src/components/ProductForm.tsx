import { ActionIcon, Alert, Button, Card, Group, NumberInput, Stack, Text } from "@mantine/core"
import { Controller, useForm, useWatch } from "react-hook-form"
import { productLookupRequestSchema, productLookupResponseSchema, type ProductLookupRequest, type ProductLookupResponse } from "../schemas/productLookupSchema"
import { httpPost } from "../lib/api"
import { showError } from "../lib/utils"
import { LuSearchCheck } from "react-icons/lu"
import { useEffect, useRef, useState } from "react"
import { CustomSelect } from "./CustomSelect"
import CreateProductForm from "./product/CreateProductForm"
import CampoDaSparare from "./CampoDaSparare"

export type ProductRow = {
    alias: string | null
    code: string
    name: string
    unitOfMeasure: string
    quantity: number
    fridgeUUID: string
    fridgeDescription: string
}

type ProductFormValues = {
    alias: string
    code: string
    name: string
    unitOfMeasure: string
    quantity: number | ''
    fridgeUUID: string
}

type SelectOption = { value: string, label: string }

type ProductFormProps = {
    fridgeOptions: SelectOption[]
    initialRow?: ProductRow
    editIndex?: number
    onSubmitRow: (row: ProductRow, index?: number) => void
}

export default function ProductForm({ fridgeOptions, initialRow, editIndex, onSubmitRow }: ProductFormProps) {
    const [lookupOk, setLookupOk] = useState(!!initialRow)
    const [isLookingUp, setIsLookingUp] = useState(false)

    // Alias per cui Passepartout non ha trovato nessun articolo: si propone di crearlo
    const [notFoundAlias, setNotFoundAlias] = useState<string | null>(null)
    const [creating, setCreating] = useState(false)

    // Ultimo alias cercato con successo: evita di rifare la ricerca (Invio e uscita dal campo la lanciano entrambi)
    const lookedUpAlias = useRef<string | null>(initialRow?.alias ?? null)

    // Form values
    const { control, handleSubmit, register, reset, setValue, getValues, formState: { isSubmitting, errors } } = useForm<ProductFormValues>({
        shouldUnregister: false,
        mode: 'onSubmit',
        reValidateMode: 'onChange',
        defaultValues: {
            alias: initialRow?.alias ?? '',
            code: initialRow?.code ?? '',
            name: initialRow?.name ?? '',
            unitOfMeasure: initialRow?.unitOfMeasure ?? '',
            quantity: initialRow?.quantity ?? 1,
            fridgeUUID: initialRow?.fridgeUUID ?? ''
        }
    })


    // Edit mode: populate fields (necessary for multiple modals opening subsequently)
    useEffect(() => {
        if (initialRow) {
            reset({
                alias: initialRow.alias ?? '',
                code: initialRow.code ?? '',
                name: initialRow.name ?? '',
                unitOfMeasure: initialRow.unitOfMeasure ?? '',
                quantity: initialRow.quantity ?? null,
                fridgeUUID: initialRow.fridgeUUID ?? ''
            })
            lookedUpAlias.current = initialRow.alias ?? null
            setLookupOk(true)
        } else {
            reset({
                alias: '',
                code: '',
                name: '',
                unitOfMeasure: '',
                quantity: 1,
                fridgeUUID: ''
            })
            lookedUpAlias.current = null
            setLookupOk(false)
        }
        setNotFoundAlias(null)
        setCreating(false)
    }, [initialRow, reset])

    // Register lookup fields (fix for edit mode)
    useEffect(() => {
        register("code")
        register("name")
        register("unitOfMeasure")
    }, [register])

    // Lookup fields for printing
    const name = useWatch({ control, name: 'name' })
    const udm = useWatch({ control, name: 'unitOfMeasure' })
    const code = useWatch({ control, name: 'code' })

    // Riempie il form con un articolo di Passepartout (trovato o appena creato)
    const applyProduct = (data: ProductLookupResponse, alias: string) => {
        setValue('name', data.Name, { shouldValidate: true })
        setValue('unitOfMeasure', data.UnitOfMeasure, { shouldValidate: true })
        setValue('code', data.Code, { shouldValidate: true })

        // Set last used fridge for this product
        if (data.FridgeUUID && !getValues('fridgeUUID')) setValue('fridgeUUID', data.FridgeUUID, { shouldValidate: true })

        // Barcode a quantità variabile: la quantità stampata sull'etichetta precompila il campo
        if (data.Quantity !== null) setValue('quantity', data.Quantity, { shouldValidate: true })

        lookedUpAlias.current = alias
        setNotFoundAlias(null)
        setLookupOk(true)
    }

    const clearProduct = () => {
        setValue('name', '', { shouldValidate: true })
        setValue('unitOfMeasure', '', { shouldValidate: true })
        setValue('code', '', { shouldValidate: true })
    }

    // Lookup product
    const doLookup = async () => {
        const alias = (getValues('alias') ?? '').trim()
        if (!alias) return

        // Già cercato (o in corso): niente doppia chiamata
        if (isLookingUp || lookedUpAlias.current === alias) return

        try {
            setIsLookingUp(true)
            setLookupOk(false)
            setNotFoundAlias(null)

            // Fetch
            const body: ProductLookupRequest = productLookupRequestSchema.parse({ Alias: alias })
            const raw = await httpPost('/products/lookup', body)

            // Validate and parse
            const data = productLookupResponseSchema.parse(raw) as ProductLookupResponse
            applyProduct(data, alias)

        } catch (e: any) {
            clearProduct()
            lookedUpAlias.current = null
            setLookupOk(false)

            if (e?.name === 'ApiError' && e.status === 404) {
                // Non è un errore: l'articolo non esiste ancora, si può crearlo al volo
                setNotFoundAlias(alias)
            } else {
                showError({ title: 'Errore durante la ricerca del prodotto', error: e })
            }
        } finally {
            setIsLookingUp(false)
        }
    }


    // Submit
    const onSubmit = (v: ProductFormValues) => {
        if (!lookupOk) return
        if (v.quantity === '') return

        const submitRow: ProductRow = {
            alias: v.alias.trim() || null,
            code: v.code,
            name: v.name,
            unitOfMeasure: v.unitOfMeasure,
            quantity: v.quantity,
            fridgeUUID: v.fridgeUUID,
            fridgeDescription: fridgeOptions.find(f => f.value === v.fridgeUUID)?.label || ''
        }

        onSubmitRow(submitRow, editIndex)
    }


    // UI
    const lookupVisible = Boolean(name && udm)

    // Creazione al volo di un articolo mancante: al termine il form prosegue come dopo una ricerca riuscita
    if (creating && notFoundAlias) {
        return (
            <Stack gap="xs">
                <CreateProductForm
                    initialAlias={notFoundAlias}
                    onCancel={() => setCreating(false)}
                    onCreated={(product) => {
                        applyProduct(product, notFoundAlias)
                        setCreating(false)
                    }}
                />
            </Stack>
        )
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Stack gap="xs">
                {/* Alias */}
                <Controller
                    control={control}
                    name="alias"
                    rules={{ required: 'Inserisci il codice prodotto' }}
                    render={({ field }) => (
                        <CampoDaSparare
                            label="Alias prodotto"
                            placeholder="Scansiona o digita il codice"
                            value={field.value ?? ''}
                            maxLength={40}
                            onChange={(e) => {
                                // Invalidate lookup every time I change the alias
                                setLookupOk(false)
                                setNotFoundAlias(null)
                                lookedUpAlias.current = null
                                field.onChange(e.currentTarget.value)
                            }}
                            onBlur={async () => {
                                field.onBlur()
                                if (!initialRow) await doLookup()
                            }}
                            onScan={() => { if (!initialRow) void doLookup() }}
                            error={errors.alias?.message}
                            rightSection={
                                <ActionIcon onClick={doLookup} type="button" left={-5} loading={isLookingUp} disabled={!field.value}>
                                    <LuSearchCheck />
                                </ActionIcon>
                            }
                        />
                    )}
                />

                {/* Prodotto non trovato: proposta di creazione */}
                {notFoundAlias && (
                    <Alert color="yellow" title="Prodotto non trovato">
                        <Stack gap="xs">
                            <Text size="sm">Nessun articolo ha l'alias {notFoundAlias}. Vuoi crearlo adesso e continuare con l'inserimento?</Text>
                            <Group grow>
                                <Button variant="default" onClick={() => setNotFoundAlias(null)}>No</Button>
                                <Button onClick={() => setCreating(true)}>Crea prodotto</Button>
                            </Group>
                        </Stack>
                    </Alert>
                )}

                {/* Lookup */}
                {lookupVisible && (
                    <>
                    <Card withBorder radius="md" p="xs">
                        <Stack gap={0}>
                            <Text fw={600}>{code}</Text>
                            <Text>{name}</Text>
                        </Stack>
                    </Card>

                    {/* Quantity */}
                    <Controller
                    control={control}
                    name="quantity"
                    rules={{
                        required: 'Inserisci la quantità',
                        // Passepartout vuole quantità maggiori di zero: meglio dirlo qui che all'invio del documento
                        validate: (v) => (typeof v === 'number' && v > 0) || 'La quantità deve essere maggiore di zero'
                    }}
                    render={({ field }) => (
                        <NumberInput
                            label="Quantità"
                            placeholder="Es. 12,5"
                            rightSection={udm}
                            value={field.value}
                            onChange={field.onChange}
                            min={0}
                            allowNegative={false}
                            allowDecimal
                            decimalSeparator=","
                            allowedDecimalSeparators={[",", "."]}
                            error={errors.quantity?.message}
                        />
                    )}
                    />

                    {/* Fridge (facoltativo) */}
                    <Controller
                    control={control}
                    name="fridgeUUID"
                    render={({ field }) => (
                        <CustomSelect
                            label="Frigorifero"
                            description="Facoltativo"
                            data={fridgeOptions}
                            value={field.value || null}
                            onChange={(value) => field.onChange(value ?? '')}
                            error={errors.fridgeUUID?.message}
                            comboboxProps={{ keepMounted: false }}
                        />
                    )}
                    />
                    </>
                )}

                {/* Submit */}
                <Button type="submit" loading={isSubmitting}>Inserisci</Button>

            </Stack>
        </form>
    )
}

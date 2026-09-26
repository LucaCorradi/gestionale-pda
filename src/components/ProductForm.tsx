import { ActionIcon, Button, Card, NumberInput, Stack, Text } from "@mantine/core"
import { Controller, useForm, useWatch } from "react-hook-form"
import { productLookupRequestSchema, productLookupResponseSchema, type ProductLookupRequest, type ProductLookupResponse } from "../schemas/productLookupSchema"
import { httpPost } from "../lib/api"
import { showError } from "../lib/utils"
import { LuSearchCheck } from "react-icons/lu"
import { useEffect, useState } from "react"
import { CustomSelect } from "./CustomSelect"

export type ProductRow = {
    alias: number | null
    code: string
    name: string
    unitOfMeasure: string
    quantity: number
    fridgeUUID: string
    fridgeDescription: string
}

type ProductFormValues = {
    alias: number | null
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

    // Form values
    const { control, handleSubmit, register, reset, setValue, getValues, formState: { isSubmitting, errors } } = useForm<ProductFormValues>({
        shouldUnregister: false,
        mode: 'onSubmit',
        reValidateMode: 'onChange',
        defaultValues: {
            alias: initialRow?.alias ?? null,
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
                alias: initialRow.alias ?? null,
                code: initialRow.code ?? '',
                name: initialRow.name ?? '',
                unitOfMeasure: initialRow.unitOfMeasure ?? '',
                quantity: initialRow.quantity ?? null,
                fridgeUUID: initialRow.fridgeUUID ?? ''
            })
            setLookupOk(true)
        } else {
            reset({
                alias: null,
                code: '',
                name: '',
                unitOfMeasure: '',
                quantity: 1,
                fridgeUUID: ''
            })
            setLookupOk(false)
        }
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

    // Lookup product
    const doLookup = async () => {
        const alias = getValues('alias')
        if (!alias) return

        try {
            setIsLookingUp(true)
            setLookupOk(false)

            // Fetch
            const body: ProductLookupRequest = productLookupRequestSchema.parse({ Alias: alias })
            const raw = await httpPost('/products/lookup', body)

            // Validate and parse
            const data = productLookupResponseSchema.parse(raw) as ProductLookupResponse
            setValue('name', data.Name, { shouldValidate: true })
            setValue('unitOfMeasure', data.UnitOfMeasure, { shouldValidate: true })
            setValue('code', data.Code, { shouldValidate: true })

            // Set last used fridge for this product
            if (data.FridgeUUID && !getValues('fridgeUUID')) setValue('fridgeUUID', data.FridgeUUID, { shouldValidate: true })

            setLookupOk(true)

        } catch (e: any) {
            setValue('name', '', { shouldValidate : true })
            setValue('unitOfMeasure', '', { shouldValidate: true })
            setValue('code', '', { shouldValidate: true })
            showError({ title: 'Prodotto non trovato o errore di rete', error: e })
            setLookupOk(false)
        } finally {
            setIsLookingUp(false)
        }
    }


    // Submit
    const onSubmit = (v: ProductFormValues) => {
        if (!lookupOk) return
        if (v.quantity === '') return

        const submitRow: ProductRow = {
            alias: v.alias,
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



    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Stack gap="xs">
                {/* Alias */}
                <Controller
                    control={control}
                    name="alias"
                    rules={{ required: 'Inserisci il codice prodotto' }}
                    render={({ field }) => (
                        <NumberInput
                            label="Alias prodotto"
                            placeholder="Es. ABC123"
                            value={field.value ?? undefined}
                            onChange={(e) => {
                                // Invalidate lookup every time I change the alias
                                setLookupOk(false)
                                field.onChange(e)
                            }}
                            onBlur={async () => {
                                field.onBlur()
                                if (!initialRow) await doLookup()
                            }}
                            onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    if(!initialRow) await doLookup()
                                }
                            }}
                            error={errors.alias?.message}
                            rightSection={
                                <ActionIcon onClick={doLookup} type="button" left={-5} loading={isLookingUp} disabled={!field.value}>
                                    <LuSearchCheck />
                                </ActionIcon>
                            }
                        />
                    )}
                />

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
                    rules={{ required: 'Inserisci la quantità '}}
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

                    {/* Fridge */}
                    <Controller
                    control={control}
                    name="fridgeUUID"
                    rules={{ required: 'Seleziona un frigorifero' }}
                    render={({ field }) => (
                        <CustomSelect
                            label="Frigorifero"
                            data={fridgeOptions}
                            value={field.value}
                            onChange={field.onChange}
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
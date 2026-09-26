import { employeeSchema, operationDetailResponseSchema, supplierSchema, warehouseSchema, type OperationDetailResponse } from "../../schemas/operationDetailSchema"
import { Loader, NumberInput, ScrollArea } from "@mantine/core"
import { goToStep, truncateToStep, setSelection, setStepData, type OperationDetailsSelection } from "../wizard/wizardSlice"
import { useDispatch, useSelector } from "react-redux"
import { DatePickerInput } from "@mantine/dates"
import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import type { RootState } from "../../store"
import { showError } from "../../lib/utils"
import { z } from "zod"
import { Controller, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { httpGet } from "../../lib/api"
import { fridgeResponseSchema, type FridgeResponse } from "../../schemas/fridgeSchema"
import WizardStepContainer from "../../components/WizardStepContainer"
import NavigationButtons from "../../components/NavigationButtons"
import dayjs from "dayjs"
import { CustomSelect } from "../../components/CustomSelect"
import ButtonSelect from "../../components/ButtonSelect"

dayjs.locale('it')

type SelectOption = {
    value: string
    label: string
}

export default function Step3() {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [posting, setPosting] = useState<boolean>(false)

    const selections = useSelector((s: RootState) => s.wizard.selections)
    const cached = useSelector((s: RootState) => s.wizard.stepsData.step3) as OperationDetailResponse | undefined
    const currentStep4Data = useSelector((s: RootState) => s.wizard.stepsData.step4) as FridgeResponse[] | undefined

    // Save source values
    const [suppliersSrc, setSuppliersSrc] = useState<z.infer<typeof supplierSchema>[] | undefined>()
    const [whFromSrc, setWhFromSrc] = useState<z.infer<typeof warehouseSchema>[] | undefined>()
    const [whToSrc, setWhToSrc] = useState<z.infer<typeof warehouseSchema>[] | undefined>()
    const [employeesSrc, setEmployeesSrc] = useState<z.infer<typeof employeeSchema>[] | undefined>()
    const [hasDocumentNumber, setHasDocumentNumber] = useState<boolean>(false)

    // Prepare select options
    const [supplierOpts, setSupplierOpts] = useState<SelectOption[] | undefined>()
    const [whFromOpts, setWhFromOpts] = useState<SelectOption[] | undefined>()
    const [whToOpts, setWhToOpts] = useState<SelectOption[] | undefined>()
    const [employeeOpts, setEmployeeOpts] = useState<SelectOption[] | undefined>()

    // Variables for conditional validation (the non existent fields should bypass validation)
    const requireEmployee = !!employeeOpts?.length
    const requireSupplier = !!supplierOpts?.length
    const requireWhFrom = !!whFromOpts?.length
    const requireWhTo = !!whToOpts?.length
    const requireDocumentNumber = hasDocumentNumber

    // Zod form schema
    const FormSchema = z.object({
        operationDate: z.union([z.date(), z.string()]).nullable().refine((v) => v !== null && (v instanceof Date || !Number.isNaN(Date.parse(v))), { message: 'Seleziona una data' }),
        employeeId: z.string().nullable().refine((v) => !requireEmployee || !!v, { message: 'Seleziona un operatore' }),
        supplierId: z.string().nullable().refine((v) => !requireSupplier || !!v, { message: 'Seleziona un fornitore' }),
        whFromName: z.string().nullable().refine((v) => !requireWhFrom || !!v, { message: 'Seleziona un magazzino' }),
        whToName: z.string().nullable().refine((v) => !requireWhTo || !!v, { message: 'Seleziona un magazzino' }),
        documentNumber: z.number().int().positive().nullable().refine((v) => !requireDocumentNumber || v !== null, { message: 'Inserisci un numero di documento valido' })
    }).refine((values) => !(values.whFromName && values.whToName && values.whFromName === values.whToName), {
        path: ['whToName'],
        message: 'Il magazzino di destinazione deve essere diverso da quello di origine'
    })

    type FormValues = z.infer<typeof FormSchema>

    // Precompile default values if present in store
    const defaultValues: FormValues = {
        operationDate: selections.operationDetails?.operationDate ? new Date(selections.operationDetails.operationDate) : new Date(),
        employeeId: selections.operationDetails?.Employees?.[0]?.ID ? String(selections.operationDetails.Employees[0].ID) : null,
        supplierId: selections.operationDetails?.Suppliers?.[0]?.ID ? String(selections.operationDetails.Suppliers[0].ID) : null,
        whFromName: selections.operationDetails?.WarehousesFrom?.[0]?.Name ?? null,
        whToName: selections.operationDetails?.WarehousesTo?.[0]?.Name ?? null,
        documentNumber: selections.operationDetails?.DocumentNumber ?? null
    }

    // Use from definition
    const { control, handleSubmit, formState: { errors, isValid } } = useForm<FormValues>({
        defaultValues,
        resolver: zodResolver(FormSchema),
        mode: 'onChange',
        reValidateMode: 'onChange'
    })



    // Init component
    useEffect(() => {
        // If no data cached from step 2, truncate and navigate
        if (!cached) {
            dispatch(truncateToStep('step2'))
            setTimeout(() => navigate('/', { replace: true }), 0) // Ensure state is flushed before navigating
            return
        }

        // Parse data
        try {
            const parsed = operationDetailResponseSchema.parse(cached)

            if (parsed.Suppliers !== undefined) {
                const arr = z.array(supplierSchema).parse(parsed.Suppliers)
                setSuppliersSrc(arr)
                setSupplierOpts(arr.map((s) => ({ value: String(s.ID), label: s.CompanyName })))
            }
            if (parsed.WarehousesFrom !== undefined) {
                const arr = z.array(warehouseSchema).parse(parsed.WarehousesFrom)
                setWhFromSrc(arr)
                setWhFromOpts(arr.map((w) => ({ value: w.Name, label: w.Name })))
            }
            if (parsed.WarehousesTo !== undefined) {
                const arr = z.array(warehouseSchema).parse(parsed.WarehousesTo)
                setWhToSrc(arr)
                setWhToOpts(arr.map((w) => ({ value: w.Name, label: w.Name })))
            }
            if (parsed.Employees !== undefined) {
                const arr = z.array(employeeSchema).parse(parsed.Employees)
                setEmployeesSrc(arr)
                setEmployeeOpts(arr.map((e) => ({ value: String(e.ID), label: e.EmployeeName })))
            }

            setHasDocumentNumber('DocumentNumber' in parsed)

        } catch (e) {
            showError({ title: 'Errore nel parsing dei dati del dettaglio operazione', error: e })
        } finally {
            setLoading(false)
        }
    }, [cached, dispatch, navigate])




    // Submit
    const onSubmit = async (values: FormValues) => {
        const opDate = values.operationDate == null
            ? null
            : (values.operationDate instanceof Date ? values.operationDate : new Date(values.operationDate))

        const supplier = suppliersSrc && values.supplierId ? suppliersSrc.find(x => String(x.ID) === values.supplierId) : undefined
        const warehouseFrom = whFromSrc && values.whFromName ? whFromSrc.find(x => x.Name === values.whFromName) : undefined
        const warehouseTo = whToSrc && values.whToName ? whToSrc.find(x => x.Name === values.whToName) : undefined
        const employee = employeesSrc && values.employeeId ? employeesSrc.find(x => String(x.ID) === values.employeeId) : undefined

        // Step 4 doesn't change based on step 3 selections, so we can skip validation and truncation
        const payload: OperationDetailsSelection = {
            operationDate: opDate ? opDate.toISOString() : null,
            Suppliers: supplier ? [supplier] : [],
            WarehousesFrom: warehouseFrom ? [warehouseFrom] : [],
            WarehousesTo: warehouseTo ? [warehouseTo] : [],
            Employees: employee ? [employee] : [],
            DocumentNumber: values.documentNumber ?? undefined
        }

        try {
            setPosting(true)

            // Save selection...
            dispatch(setSelection({ key: 'operationDetails', value: payload }))

            //..download step 4 data if not present...
            if (!currentStep4Data) {
                const raw = await httpGet<unknown>('/fridges')

                // Validate response
                const listSchema = z.array(fridgeResponseSchema)
                const data = listSchema.parse(raw) as FridgeResponse[]

                // Save data in cache
                dispatch(setStepData({ step: 'step4', data: data }))
            }

            //...and go to step 4
            dispatch(goToStep('step4'))
            navigate('/wizard/step4')

        } catch (e: any) {
            showError({ title: 'Errore durante il fetch dei frigoriferi', error: e })
        } finally {
            setPosting(false)
        }
    }



    // UI
    if (loading) return <Loader />

    return (
        <WizardStepContainer>
            <ScrollArea type="always" offsetScrollbars flex={1}>

                {/* Date input is always present */}
                <Controller control={control} name="operationDate" render={({ field }) => (
                    <DatePickerInput
                        valueFormat="DD/MM/YYYY"
                        label="Data operazione"
                        placeholder="Seleziona data"
                        value={field.value
                            ? (field.value instanceof Date ? field.value : new Date(field.value))
                            : null
                        }
                        onChange={field.onChange}
                        locale="it"
                        error={errors.operationDate?.message}
                    />
                )} />

                {/* Render inputs only if the key is present in the response */}
                {requireDocumentNumber && (
                    <Controller control={control} name="documentNumber" render={({ field }) => (
                        <NumberInput
                            label="Numero Documento"
                            placeholder="Es. 12345"
                            value={field.value ?? undefined}
                            onChange={(val) => {
                                const num = typeof val === 'number' ? val : Number.isFinite(Number(val)) ? Number(val) : null
                                field.onChange(Number.isFinite(num as number) ? (num as number) : null)
                            }}
                            error={errors.documentNumber?.message}
                            allowNegative={false}
                            allowDecimal={false}
                            clampBehavior="strict"
                        />
                    )} />
                )}

                {requireEmployee && (
                    <Controller control={control} name="employeeId" render={({ field }) => (
                        <ButtonSelect
                            label="Operatore"
                            data={employeeOpts ?? []}
                            value={field.value}
                            onChange={field.onChange}
                            error={errors.employeeId?.message}
                        />
                    )} />
                )}

                {requireSupplier && (
                    <Controller control={control} name="supplierId" render={({ field }) => (
                        <CustomSelect
                            label="Fornitore"
                            searchable
                            data={supplierOpts}
                            value={field.value}
                            onChange={field.onChange}
                            error={errors.supplierId?.message}
                        />
                    )} />
                )}

                {requireWhFrom && (
                    <Controller control={control} name="whFromName" render={({ field }) => (
                        <ButtonSelect
                            label="Magazzino Origine"
                            data={whFromOpts ?? []}
                            value={field.value}
                            onChange={field.onChange}
                            error={errors.whFromName?.message}
                        />
                    )} />
                )}

                {requireWhTo && (
                    <Controller control={control} name="whToName" render={({ field }) => (
                        <ButtonSelect
                            label="Magazzino Destinazione"
                            data={whToOpts ?? []}
                            value={field.value}
                            onChange={field.onChange}
                            error={errors.whToName?.message}
                        />
                    )} />
                )}

            </ScrollArea>

            <NavigationButtons onNavigateNext={() => { void handleSubmit(onSubmit)() }} nextDisabled={!isValid || posting} />
        </WizardStepContainer>
    )
}
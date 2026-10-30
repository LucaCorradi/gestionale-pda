import { type DepartmentResponse, departmentResponseSchema } from "../../schemas/departmentSchema"
import { goToStep, setSelection, setStepData, truncateToStep } from "../wizard/wizardSlice"
import { Button, Group, Radio, Stack, Text } from "@mantine/core"
import { httpGet, httpPost } from "../../lib/api"
import { useEffect, useState } from "react"
import { showError } from "../../lib/utils"
import { useDispatch, useSelector } from "react-redux"
import { z } from "zod"
import CustomSpinner from "../../components/CustomSpinner"
import type { RootState } from "../../store"
import { useNavigate } from "react-router-dom"
import WizardStepContainer from "../../components/WizardStepContainer"
import NavigationButtons from "../../components/NavigationButtons"
import AreaScorrevole from "../../components/AreaScorrevole"
import AvvisoPagina from "../../components/AvvisoPagina"

export default function Step1() {
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const cached = useSelector((s: RootState) => s.wizard.stepsData.step1) as DepartmentResponse[] | undefined
    const selections = useSelector((s: RootState) => s.wizard.selections)

    const [departments, setDepartments] = useState<DepartmentResponse[] | null>(null)
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(selections.department ? String(selections.department.ID) : null)
    // Parte già "in caricamento": altrimenti al primo disegno, prima della richiesta, compare "Nessun reparto disponibile"
    const [loading, setLoading] = useState<boolean>(true)
    const [loadError, setLoadError] = useState<string | null>(null)
    // Cambiandolo si ripete il caricamento (pulsante Riprova)
    const [attempt, setAttempt] = useState(0)
    const [posting, setPosting] = useState<boolean>(false)

    // Fetch Step1 departments data
    useEffect(() => {
        let cancelled = false

        // Manage state
        dispatch(goToStep('step1'))

        // Fetch function
        const fetchDepartments = async () => {
            try {
                setLoading(true)
                setLoadError(null)
                // Get departments from api
                const raw = await httpGet('/departments')

                // Validate response
                const listSchema = z.array(departmentResponseSchema)
                const data = listSchema.parse(raw)
                if (!cancelled) {
                    setDepartments(data)
                    // Save data in cache
                    dispatch(setStepData({ step: 'step1', data: data }))
                }
            } catch (e: any) {
                if (!cancelled) {
                    setLoadError(e?.message ?? 'Errore sconosciuto')
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        // If step 1 data is not already present in store, fetch it
        if (cached) {
            const listSchema = z.array(departmentResponseSchema)
            const data = listSchema.parse(cached)
            setDepartments(data)
            setLoading(false)
        } else {
            fetchDepartments()
        }

        return () => {
            cancelled = true
        }
    }, [dispatch, cached, attempt])

    // Handle submit
    const handleSubmit = async () => {

        if (!selectedDepartmentId || !departments) return

        const dep = departments.find((d) => String(d.ID) === selectedDepartmentId)
        if (!dep) return

        try {
            setPosting(true)

            // If the selection didn't change, go to next step without touching anything
            if (selections.department && String(selections.department.ID) === selectedDepartmentId) {
                dispatch(goToStep('step2'))
                navigate('/wizard/step2')
                return
            }

            // Otherwise, save the selection...
            dispatch(setSelection({ key: 'department', value: dep }))

            //...invalidate further selections...
            dispatch(truncateToStep('step1'))

            //...fetch and save step 2 data...
            const payload = { DepartmentID: dep.ID }
            const step2Data = await httpPost<unknown>('/operation-types', payload)
            dispatch(setStepData({ step: 'step2', data: step2Data }))

            //...and go to step 2.
            dispatch(goToStep('step2'))
            navigate('/wizard/step2')

        } catch (e: any) {
            showError({ title: 'Impossibile caricare le operazioni', error: e })
        } finally {
            setPosting(false)
        }
    }

    // State driven UI
    if (loading) return <CustomSpinner />
    if (loadError) {
        return (
            <AvvisoPagina color="red" title="Impossibile caricare i reparti" actionLabel="Riprova" onAction={() => setAttempt((n) => n + 1)}>
                {loadError}
            </AvvisoPagina>
        )
    }
    if (!departments?.length) {
        return <AvvisoPagina title="Nessun reparto disponibile" actionLabel="Riprova" onAction={() => setAttempt((n) => n + 1)} />
    }

    return (
        <WizardStepContainer>
            <Text fw={500} c="dimmed">Seleziona un reparto</Text>
            <AreaScorrevole>
                <Radio.Group value={selectedDepartmentId} onChange={setSelectedDepartmentId}>
                    <Stack pt="md" gap="xs">
                        {departments.map((dep) => (
                            <Radio.Card className="radiocard__root" key={dep.ID} value={String(dep.ID)} radius="md">
                                <Group wrap="nowrap" align="flex-start">
                                    <Radio.Indicator />
                                    <Text className="radiocard__text">{dep.Name}</Text>
                                </Group>
                            </Radio.Card>
                        ))}
                    </Stack>
                </Radio.Group>
            </AreaScorrevole>
            {/* Inventario: si usa ogni tanto, fuori dalle operazioni quotidiane e meno in evidenza (circa un terzo della riga) */}
            <Group mb="xs" gap="xs" wrap="nowrap">
                <Button flex={2} onClick={() => navigate('/products')}>Gestione prodotti</Button>
                <Button flex={1} variant="default" onClick={() => navigate('/inventory')}>Inventario</Button>
            </Group>
            <NavigationButtons onNavigateNext={handleSubmit} nextDisabled={!selectedDepartmentId || posting} />
        </WizardStepContainer>
    )
}
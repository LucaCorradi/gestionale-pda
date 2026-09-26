import { type DepartmentResponse, departmentResponseSchema } from "../../schemas/departmentSchema"
import { goToStep, setSelection, setStepData, truncateToStep } from "../wizard/wizardSlice"
import { Alert, Group, Radio, ScrollArea, Stack, Text } from "@mantine/core"
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

export default function Step1() {
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const cached = useSelector((s: RootState) => s.wizard.stepsData.step1) as DepartmentResponse[] | undefined
    const selections = useSelector((s: RootState) => s.wizard.selections)

    const [departments, setDepartments] = useState<DepartmentResponse[] | null>(null)
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(selections.department ? String(selections.department.ID) : null)
    const [loading, setLoading] = useState<boolean>(false)
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
                    showError({ title: 'Errore durante il fetch dei reparti', error: e})
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
        } else {
            fetchDepartments()
        }

        return () => {
            cancelled = true
        }
    }, [dispatch, cached])

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
            showError({ title: 'Errore durante il fetch delle operazioni', error: e })
        } finally {
            setPosting(false)
        }
    }

    // State driven UI
    if (loading) return <CustomSpinner />
    if (!departments?.length) return <Alert color="yellow">Nessun reparto disponibile</Alert>

    return (
        <WizardStepContainer>
            <Text fw={500} c="dimmed">Seleziona un reparto</Text>
            <ScrollArea type="always" offsetScrollbars flex={1}>
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
            </ScrollArea>
            <NavigationButtons onNavigateNext={handleSubmit} nextDisabled={!selectedDepartmentId || posting} />
        </WizardStepContainer>
    )
}
import { operationTypeResponseSchema, type OperationTypeResponse } from "../../schemas/operationTypeSchema"
import { goToStep, setSelection, setStepData, truncateToStep } from "../wizard/wizardSlice"
import { Group, Radio, Stack, Text } from "@mantine/core"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import type { RootState } from "../../store"
import { showError } from "../../lib/utils"
import { httpPost } from "../../lib/api"
import { z } from "zod"
import CustomSpinner from "../../components/CustomSpinner"
import WizardStepContainer from "../../components/WizardStepContainer"
import NavigationButtons from "../../components/NavigationButtons"
import AreaScorrevole from "../../components/AreaScorrevole"
import AvvisoPagina from "../../components/AvvisoPagina"
import { etichettaOperazione } from "../../schemas/utils"


export default function Step2() {
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const selections = useSelector((s: RootState) => s.wizard.selections)
    const cached = useSelector((s: RootState) => s.wizard.stepsData.step2) as OperationTypeResponse[] | undefined

    const [operationTypes, setOperationTypes] = useState<OperationTypeResponse[] | null>(null)
    const [selectedOperationTypeId, setSelectedOperationTypeId] = useState<string | null>(selections.operationType ? String(selections.operationType.ID) : null)
    const [loading, setLoading] = useState<boolean>(true)
    const [posting, setPosting] = useState<boolean>(false)

    useEffect(() => {
        try {
            // If no data cached from step 1, truncate and navigate
            if (!cached) {
                dispatch(truncateToStep('step1'))
                setTimeout(() => navigate('/', { replace: true }), 0) // Ensure state is flushed before navigating
                return
            }

            // Parse raw data
            const listSchema = z.array(operationTypeResponseSchema)
            const parsed = listSchema.parse(cached)
            setOperationTypes(parsed)
        } catch (e: any) {
            showError({ title: 'Dati delle operazioni non validi', error: e })
        } finally {
            setLoading(false)
        }
    }, [cached, dispatch, navigate])

    const handleSubmit = async () => {

        if (!selectedOperationTypeId || !operationTypes) return

        const opType = operationTypes.find(x => String(x.ID) === selectedOperationTypeId)
        if (!opType) return

        try {
            setPosting(true)

            // If the selection didn't change, go to next step without touching anything
            if (selections.operationType && String(selections.operationType.ID) === selectedOperationTypeId) {
                dispatch(goToStep('step3'))
                navigate('/wizard/step3')
                return
            }

            // Otherwise, save the selection...
            dispatch(setSelection({ key: 'operationType', value: opType }))

            //...invalidate further selections...
            dispatch(truncateToStep('step2'))

            //... fetch and save step 3 data...
            const payload = { OperationTypeID: opType.ID }
            const step3Data = await httpPost('/operation-details', payload)
            dispatch(setStepData({ step: 'step3', data: step3Data }))

            //...and go to step 3.
            dispatch(goToStep('step3'))
            navigate('/wizard/step3')
        } catch (e: any) {
            showError({ title: "Impossibile caricare i dati dell'operazione", error: e })
        } finally {
            setPosting(false)
        }
    }

    // State driven UI
    if (loading) return <CustomSpinner />
    if (!operationTypes?.length) {
        return (
            <AvvisoPagina title="Nessuna operazione disponibile per questo reparto" actionLabel="Indietro" onAction={() => {
                dispatch(truncateToStep('step1'))
                navigate('/')
            }} />
        )
    }

    return (
        <WizardStepContainer>
            <Text fw={500} c="dimmed">Seleziona un'operazione</Text>
            <AreaScorrevole>
                <Radio.Group value={selectedOperationTypeId} onChange={setSelectedOperationTypeId}>
                    <Stack pt="md" gap="xs">
                        {operationTypes.map((opType) => (
                            <Radio.Card className="radiocard__root" key={opType.ID} value={String(opType.ID)} radius="md">
                                <Group wrap="nowrap" align="flex-start">
                                    <Radio.Indicator />
                                    <Text className="radiocard__text">{etichettaOperazione(opType.Name)}</Text>
                                </Group>
                            </Radio.Card>
                        ))}
                    </Stack>
                </Radio.Group>
            </AreaScorrevole>
            <NavigationButtons onNavigateNext={handleSubmit} nextDisabled={!selectedOperationTypeId || posting} />
        </WizardStepContainer>
    )
}
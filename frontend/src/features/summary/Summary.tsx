import { Button, Card, Divider, Group, Modal, SimpleGrid, Stack, Text, ThemeIcon } from "@mantine/core"
import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import { goToStep, reset } from "../wizard/wizardSlice"
import type { RootState } from "../../store"
import WizardStepContainer from "../../components/WizardStepContainer"
import NavigationButtons from "../../components/NavigationButtons"
import { operationConfirmProductSchema, operationConfirmRequestSchema, operationConfirmResponseSchema, type OperationConfirmRequest, type OperationConfirmResponse } from "../../schemas/operationConfirmSchema"
import { httpPost } from "../../lib/api"
import { showError } from "../../lib/utils"
import { useDisclosure } from "@mantine/hooks"
import { LuCheck } from "react-icons/lu"
import ProductsTable from "../../components/ProductsTable"
import AreaScorrevole from "../../components/AreaScorrevole"

export default function Summary() {
    const [posting, setPosting] = useState<boolean>(false)
    const [successDocNumber, setSuccessDocNumber] = useState<number | null>(null)
    const [openedConfirmModal, { open: openConfirmModal, close: closeConfirmModal }] = useDisclosure(false)
    const [openedSuccessModal, { open: openSuccessModal, close: closeSuccessModal }] = useDisclosure(false)
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const { selections, history } = useSelector((s: RootState) => s.wizard)

    // Guards
    useEffect(() => {
        // If state was reset, skip guard
        if (history.length === 0) return

        if (!history.includes('step4')) {
            dispatch(goToStep('step4'))
            navigate('/wizard/step4')
        }
    }, [selections, history, navigate])

    // Values
    const dep = selections.department
    const op = selections.operationType
    const det = selections.operationDetails
    const products = selections.products

    // Detail values, if present:
    const supplier = det?.Suppliers?.[0]
    const whFrom = det?.WarehousesFrom?.[0]
    const whTo = det?.WarehousesTo?.[0]
    const employee = det?.Employees?.[0]

    const handleSubmit = async () => {
        if (!products || products.length === 0) return

        try {
            setPosting(true)

            const productsPayload = products.map((p) => operationConfirmProductSchema.parse({
                Code: p.code,
                Quantity: typeof p.quantity === 'string' ? Number(p.quantity) : p.quantity,
                // Il frigorifero è facoltativo: senza selezione il campo non viene inviato
                FridgeUUID: p.fridgeUUID || undefined
            }))

            const payload: OperationConfirmRequest = operationConfirmRequestSchema.parse({
                DepartmentID: dep?.ID,
                OperationTypeID: op?.ID,
                DocumentDate: det?.operationDate,
                DocumentNumber: det?.DocumentNumber ?? undefined,
                EmployeeName: employee?.EmployeeName,
                WarehouseFrom: whFrom?.Name ?? undefined,
                WarehouseTo: whTo?.Name ?? undefined,
                Supplier: supplier?.CompanyName ?? undefined,
                Products: productsPayload,
            })

            const raw = await httpPost('/confirm', payload)
            const resp = operationConfirmResponseSchema.parse(raw) as OperationConfirmResponse

            // Show modal for success and navigate to step 1
            closeConfirmModal()
            setSuccessDocNumber(resp.Number)
            openSuccessModal()
        } catch (e) {
            showError({ title: "Errore durante la conferma dell'operazione", error: e })
        } finally {
            setPosting(false)
        }
    }

    const handleSuccessClick = () => {
        closeSuccessModal()
        dispatch(reset())
        setTimeout(() => navigate('/', { replace: true }), 0) // Ensure state is flushed before navigating
    }

    return (
        <>
        <WizardStepContainer>
            <Text fw={500} c="dimmed">Riepilogo</Text>

            <AreaScorrevole>
                <Stack>

                    <Card withBorder>
                        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xs">
                            {dep && (
                                <Stack gap={0}>
                                    <Text size="xs" c="dimmed" fw={600}>Reparto</Text>
                                    <Text>{dep.Name}</Text>
                                </Stack>
                            )}

                            {op && (
                                <Stack gap={0}>
                                    <Text size="xs" c="dimmed" fw={600}>Operazione</Text>
                                    <Text>{op.Name}</Text>
                                </Stack>
                            )}

                            {det?.operationDate && (
                                <Stack gap={0}>
                                    <Text size="xs" c="dimmed" fw={600}>Data</Text>
                                    <Text>{new Date(det.operationDate).toLocaleDateString()}</Text>
                                </Stack>
                            )}

                            {det?.DocumentNumber && (
                                <Stack gap={0}>
                                    <Text size="xs" c="dimmed" fw={600}>Numero Documento</Text>
                                    <Text>{det.DocumentNumber}</Text>
                                </Stack>
                            )}

                            {employee && (
                                <Stack gap={0}>
                                    <Text size="xs" c="dimmed" fw={600}>Operatore</Text>
                                    <Text>{employee.EmployeeName}</Text>
                                </Stack>
                            )}

                            {supplier && (
                                <Stack gap={0}>
                                    <Text size="xs" c="dimmed" fw={600}>Fornitore</Text>
                                    <Text>{supplier.CompanyName}</Text>
                                </Stack>
                            )}

                            {whFrom && (
                                <Stack gap={0}>
                                    <Text size="xs" c="dimmed" fw={600}>Magazzino origine</Text>
                                    <Text>{whFrom.Name}</Text>
                                </Stack>
                            )}

                            {whTo && (
                                <Stack gap={0}>
                                    <Text size="xs" c="dimmed" fw={600}>Magazzino destinazione</Text>
                                    <Text>{whTo.Name}</Text>
                                </Stack>
                            )}
                        </SimpleGrid>
                    </Card>

                    <Divider label="Prodotti" />

                    {!products?.length ? (
                        <Text c="dimmed" size="sm">
                            Nessun prodotto inserito.
                        </Text>
                    ) : (
                        <ProductsTable products={products} />
                    )}

                </Stack>
            </AreaScorrevole>

            <NavigationButtons onNavigateNext={openConfirmModal} isLast nextDisabled={posting} />

        </WizardStepContainer>
        <Modal title="Conferma l'invio dei dati" opened={openedConfirmModal} onClose={posting ? () => {} : closeConfirmModal} withCloseButton={!posting} closeOnClickOutside={!posting} closeOnEscape={!posting} centered>
            <Stack>
                <Text size="sm">
                    Confermi l'invio dell'operazione? Verranno salvati i dati riepilogati in questa pagina e non sarà possibile modificarli in seguito.
                </Text>
                <Group justify="flex-end" mt="sm">
                    <Button variant="default" onClick={closeConfirmModal} disabled={posting}>Annulla</Button>
                    <Button loading={posting} onClick={async () => {
                        await handleSubmit()
                        if (!posting) closeConfirmModal()
                    }}>Invia</Button>
                </Group>
            </Stack>
        </Modal>
        <Modal opened={openedSuccessModal} withCloseButton centered onClose={handleSuccessClick}>
            <Stack align="center">
                <ThemeIcon color="green" variant="light" size="xl" radius="xl"><LuCheck size={32} /></ThemeIcon>
                <Text fw={600}>Il documento è stato creato con successo!</Text>
                <Text>Numero documento: {successDocNumber ?? '-'}</Text>
                <Button mt="lg" onClick={handleSuccessClick}>Ok</Button>
            </Stack>
        </Modal>
        </>
    )
}
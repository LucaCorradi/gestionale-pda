import { ActionIcon, Group, Loader, Modal, Text } from "@mantine/core"
import { useEffect, useState } from "react"
import { LuPlus } from "react-icons/lu"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import ProductForm, { type ProductRow } from "../../components/ProductForm"
import { useDisclosure } from "@mantine/hooks"
import { type FridgeResponse } from "../../schemas/fridgeSchema"
import { goToStep, setSelection, truncateToStep } from "../wizard/wizardSlice"
import type { RootState } from "../../store"
import { showError } from "../../lib/utils"
import WizardStepContainer from "../../components/WizardStepContainer"
import NavigationButtons from "../../components/NavigationButtons"
import ProductsTable from "../../components/ProductsTable"
import AreaScorrevole from "../../components/AreaScorrevole"

type SelectOption = {
    value: string
    label: string
}

export default function Step4() {
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const selections = useSelector((s: RootState) => s.wizard.selections)
    const cached = useSelector((s: RootState) => s.wizard.stepsData.step4) as FridgeResponse[] | undefined

    const [loading, setLoading] = useState(false)
    const [fridges, setFridges] = useState<SelectOption[]>([])
    const [items, setItems] = useState<ProductRow[]>(selections.products ?? [])
    const [openedModal, { open: openModal, close: closeModal }] = useDisclosure(false)
    const [editIndex, setEditIndex] = useState<number | null>(null)

    // Init component
    useEffect(() => {

        // If no data cached from step 3, truncate and navigate
        if (!cached) {
            dispatch(truncateToStep('step3'))
            setTimeout(() => navigate('/', { replace: true }), 0) // Ensure state is flushed before navigating
            return
        }

        // Parse data
        try {
            setLoading(true)
            const fridgeOptions = cached.map((f) => ({ value: String(f.FridgeUUID), label: `${f.Description}` }))
            setFridges(fridgeOptions)
        } catch (e: any) {
            showError({ title: 'Errore durante il parse dei dati di step 4', error: e })
        } finally {
            setLoading(false)
        }

    }, [cached, dispatch, navigate])

    // Save items in store at every row update, for managing draft state
    useEffect(() => {
        dispatch(setSelection({ key: 'products', value: items }))
    }, [items, dispatch])


    // Helper for adding/updating/deleting a product
    const handleAddItem = (row: ProductRow) => {
        setItems((prev) => [...prev, row])
        closeModal()
    }

    const handleUpdateItem = (row: ProductRow, index?: number) => {
        if (index == null) return
        setItems((prev) => prev.map((it, i) => (i === index ? row : it)))
        closeModal()
        setEditIndex(null)
    }

    const handleRemoveItem = (index: number) => {
        setItems((prev) => prev.filter((_, i) => i !== index))
    }

    // Cambio rapido della quantita' dalla scheda aperta (palmare)
    const handleQuantityChange = (index: number, quantity: number) => {
        setItems((prev) => prev.map((it, i) => (i === index ? { ...it, quantity } : it)))
    }


    // On submit, save in store and navigate
    const onSubmit = () => {
        dispatch(goToStep('summary'))
        navigate('/wizard/summary')
    }

    // UI
    if (loading) return <Loader />

    return (
        <>
        <WizardStepContainer>
            <Group wrap="nowrap" justify="space-between">
                <Text fw={500} c="dimmed">Prodotti</Text>
                <ActionIcon
                    variant="filled"
                    size="lg"
                    radius="xl"
                    onClick={() => {
                        setEditIndex(null)
                        openModal()
                    }}>
                        <LuPlus />
                    </ActionIcon>
            </Group>
            <AreaScorrevole>
                {items.length === 0 ? (
                    <Text c="dimmed" size="sm">Nessun prodotto inserito. Premi "+" per aggiungerne uno.</Text>
                ) : (
                    <ProductsTable
                        products={items}
                        onEdit={(index) => {
                            setEditIndex(index)
                            openModal()
                        }}
                        onDelete={(index) => { handleRemoveItem(index) }}
                        onQuantityChange={handleQuantityChange}
                    />
                )}
            </AreaScorrevole>
            <NavigationButtons onNavigateNext={onSubmit} nextDisabled={items.length === 0} />
        </WizardStepContainer>

        <Modal
            padding="xs"
            opened={openedModal}
            onClose={() => {
                closeModal()
                setEditIndex(null)
            }}
            withCloseButton={false}
            centered>
            <ProductForm
                fridgeOptions={fridges}
                initialRow={editIndex != null ? items[editIndex] : undefined}
                editIndex={editIndex ?? undefined}
                onSubmitRow={(row, index) => {
                    if (index != null) handleUpdateItem(row, index)
                    else handleAddItem(row)
                }}
            />
        </Modal>
        </>
    )
}
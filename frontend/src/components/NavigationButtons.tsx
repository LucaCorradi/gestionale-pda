import { useDispatch, useSelector } from "react-redux"
import type { AppDispatch, RootState } from "../store"
import { Button, Group } from "@mantine/core"
import { LuChevronLeft, LuChevronRight, LuSave } from "react-icons/lu"
import { goToStep } from "../features/wizard/wizardSlice"
import { useNavigate } from "react-router-dom"

type NavigationButtonsProps = {
    onNavigateBack?: () => void
    onNavigateNext?: () => void
    backDisabled?: boolean
    nextDisabled?: boolean
    isLast?: boolean
}

export default function NavigationButtons({ onNavigateBack, onNavigateNext, backDisabled = false, nextDisabled = false, isLast = false }: NavigationButtonsProps) {
    const history = useSelector((s: RootState) => s.wizard.history)
    const dispatch = useDispatch<AppDispatch>()
    const navigate = useNavigate()


    const canGoBack = !backDisabled && history.length > 1
    const canGoNext = !nextDisabled && history.length < 10

    const prev = canGoBack ? history[history.length - 2] : null

    const goBack = () => {
        if (onNavigateBack) onNavigateBack()

        if (!prev) return

        dispatch(goToStep(prev))
        navigate(`/wizard/${prev}`)
    }

    const goNext = () => {
        if (onNavigateNext) onNavigateNext()
    }

    return (
        <Group wrap="nowrap" grow>
            <Button disabled={!canGoBack} onClick={goBack} leftSection={<LuChevronLeft />}>Indietro</Button>
            {isLast ? (
                <Button disabled={!canGoNext} onClick={goNext} rightSection={<LuSave />}>Invia</Button>
            ) : (
                <Button disabled={!canGoNext} onClick={goNext} rightSection={<LuChevronRight />}>Avanti</Button>
            )}
        </Group>
    )
}
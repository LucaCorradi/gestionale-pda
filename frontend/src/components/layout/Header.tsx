import { Anchor, Button, Group, Image, Text } from "@mantine/core"
import { reset } from "../../features/wizard/wizardSlice"
import type { AppDispatch, RootState } from "../../store"
import { useDispatch, useSelector } from "react-redux"
import { Link, useNavigate } from "react-router-dom"

export default function Header() {
    const navigate = useNavigate()
    const dispatch = useDispatch<AppDispatch>()
    const fullState = useSelector((s: RootState) => s.wizard)

    const goHome = () => {
        dispatch(reset())
        navigate('/')
    }

    return (
        <Group h="100%" justify="space-between" visibleFrom="md">
            <Group wrap="nowrap">
                <Image src="/logo.svg" h={36} w="auto" alt="Casa del Formaggio" onClick={goHome} style={{ cursor: 'pointer' }} />
                <Text className="cdf-occhiello">PDA magazzino</Text>
            </Group>
            <Group wrap="nowrap">
                {import.meta.env.DEV && (
                    <Button variant="light" onClick={() => console.warn(fullState)}>Print cache</Button>
                )}
                <Anchor component={Link} to="/products">Prodotti</Anchor>
                <Anchor component={Link} to="/charts">Grafici</Anchor>
            </Group>
        </Group>
    )
}
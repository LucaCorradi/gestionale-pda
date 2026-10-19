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
                <Image src="/cdf_logo.png" w={36} onClick={goHome} style={{ cursor: 'pointer' }} />
                <Text size="sm" c="dimmed">Warehouse PDA</Text>
            </Group>
            <Group wrap="nowrap">
                {import.meta.env.VITE_DEBUG === 'true' && (
                    <Button variant="light" onClick={() => console.warn(fullState)}>Print cache</Button>
                )}
                <Anchor component={Link} to="/products">Prodotti</Anchor>
                <Anchor component={Link} to="/charts">Grafici</Anchor>
            </Group>
        </Group>
    )
}
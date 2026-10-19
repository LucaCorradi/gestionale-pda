import { Center, Loader } from "@mantine/core"

type CustomSpinnerProps = {
    h?: number
}

export default function CustomSpinner({ h }: CustomSpinnerProps) {
    return (
        <Center mih={200} h={h} py="md">
            <Loader size="lg" />
        </Center>
    )
}
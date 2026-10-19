import { AppShell } from "@mantine/core"
import { Outlet } from "react-router-dom"
import Header from "./Header"
import Footer from "./Footer"

export default function App() {
    return (
        <AppShell header={{ height: { base: 0, md: 60 } }} footer={{ height: { base: 0, md: 50 } }} px="md">
            <AppShell.Header px="md">
                <Header />
            </AppShell.Header>
            <AppShell.Main>
                <Outlet />
            </AppShell.Main>
            <AppShell.Footer px="md">
                <Footer />
            </AppShell.Footer>
        </AppShell>
    )
}
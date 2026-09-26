import React from "react"
import ReactDOM from "react-dom/client"
import { MantineProvider } from "@mantine/core"
import { Notifications } from "@mantine/notifications"
import { Provider } from "react-redux"
import { BrowserRouter } from "react-router-dom"
import { mantineTheme } from "./theme"
import AppRoutes from "./AppRoutes"
import { store } from "./store"

import "@mantine/core/styles.css"
import "@mantine/notifications/styles.css"
import "@mantine/dates/styles.css"
import '@mantine/charts/styles.css'
import "./index.css"

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <MantineProvider theme={mantineTheme} defaultColorScheme="light">
            <Notifications />
            <Provider store={store}>
                <BrowserRouter>
                    <AppRoutes />
                </BrowserRouter>
            </Provider>
        </MantineProvider>
    </React.StrictMode>
)
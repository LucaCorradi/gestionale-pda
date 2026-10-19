import React from "react"
import ReactDOM from "react-dom/client"
import { MantineProvider } from "@mantine/core"
import { Notifications } from "@mantine/notifications"
import { Provider } from "react-redux"
import { BrowserRouter } from "react-router-dom"
import { brandCssVariables, mantineTheme } from "./theme"
import AppRoutes from "./AppRoutes"
import { store } from "./store"

// Prima i token del brand (copia identica di casa-del-formaggio-brand/tokens.css), poi Mantine
import "./styles/brand-tokens.css"
import "@mantine/core/styles.css"
import "@mantine/notifications/styles.css"
import "@mantine/dates/styles.css"
import '@mantine/charts/styles.css'
import "./index.css"

// Solo in produzione: in sviluppo un service worker registrato resterebbe attivo anche su altre app aperte sulla stessa porta
if ("serviceWorker" in navigator && import.meta.env.PROD) {
    navigator.serviceWorker.register("/sw.js").catch(() => {})
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <MantineProvider theme={mantineTheme} cssVariablesResolver={brandCssVariables} defaultColorScheme="light">
            <Notifications />
            <Provider store={store}>
                <BrowserRouter>
                    <AppRoutes />
                </BrowserRouter>
            </Provider>
        </MantineProvider>
    </React.StrictMode>
)
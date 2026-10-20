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

// Altezza davvero visibile, tastiera esclusa (usata da --content-height in index.css): così i pulsanti in fondo ai passi
// restano appoggiati alla tastiera. interactive-widget=resizes-content in index.html basta nella scheda di Chrome, ma
// aperto come app installata il palmare sovrappone la tastiera senza ridurre 100dvh. Moltiplicando per scale lo zoom
// con due dita non conta: si riduce solo per la tastiera.
const viewport = window.visualViewport
if (viewport) {
    const aggiornaAltezzaVisibile = () =>
        document.documentElement.style.setProperty("--altezza-visibile", `${viewport.height * viewport.scale}px`)
    viewport.addEventListener("resize", aggiornaAltezzaVisibile)
    aggiornaAltezzaVisibile()
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
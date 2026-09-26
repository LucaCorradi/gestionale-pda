import { notifications } from "@mantine/notifications"

type showErrorProps = {
    title: string
    error?: any
    showUser?: boolean
    autoClose?: boolean | number
}

export const showError = ({ title: errorTitle, error, showUser = true, autoClose = 8000 }: showErrorProps) => {
    console.error(errorTitle, error ?? '')
    if (showUser) {
        const message = error?.message ?? ''
        notifications.show({ title: errorTitle, message: message, color: "red", autoClose: autoClose })
    }
}


// Per i campi dove si scansiona un codice: al tocco si seleziona tutto il testo, così la scansione successiva lo sovrascrive.
// Serve sia onFocus (primo tocco) sia onClick (campo già attivo, dove il focus non scatta di nuovo); nel focus si attende un attimo
// perché alcuni browser mobili spostano il cursore subito dopo e annullerebbero la selezione.
export const selectAllOnFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const input = e.currentTarget
    setTimeout(() => input.select(), 0)
}
export const selectAllOnClick = (e: React.MouseEvent<HTMLInputElement>) => {
    e.currentTarget.select()
}

export const toDate = (v: unknown) => {
    if (v == null || v === '') return null
    if (v instanceof Date) return v
    if (typeof v === 'string' || typeof v === 'number') {
        const d = new Date(v)
        return isNaN(d.getTime()) ? null : d
    }
    return null
}


export const getColorFor = (input: string): string => {
    let hash = 0
    for (let i = 0; i < input.length; i++) {
        hash = input.charCodeAt(i) + ((hash << 5) - hash)
        hash |= 0
    }

    const hue = Math.abs(hash) % 360
    const sat = 65
    const light = 40

    return `hsl(${hue}, ${sat}%, ${light}%)`
}
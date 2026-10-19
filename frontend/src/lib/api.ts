// In produzione l'API è relativa (/api, VITE_API_URL impostata da deploy/aggiorna-server.sh): stesso host del sito dietro nginx.
// In sviluppo il backend gira sulla 8787 dello stesso PC da cui si apre la pagina, così dal palmare in LAN basta l'IP del PC.
const BASE_URL = import.meta.env.VITE_API_URL ?? `${location.protocol}//${location.hostname}:8787/api`

// Errore HTTP con lo stato e il messaggio inviato dal server (es. 404 "Product not found", 409 "L'alias è già associato a ...")
export class ApiError extends Error {
    status: number
    data: unknown

    constructor(message: string, status: number, data?: unknown) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.data = data
    }
}

async function toApiError(res: Response): Promise<ApiError> {
    let serverMessage: string | undefined
    let data: unknown

    try {
        data = await res.json()
        const message = (data as { message?: unknown } | null)?.message
        if (typeof message === 'string' && message.length > 0) serverMessage = message
    } catch {
        // risposta senza corpo JSON: resta il messaggio generico
    }

    return new ApiError(serverMessage ?? `${res.status} ${res.statusText}`, res.status, data)
}

export async function httpGet<T = unknown>(url: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${url}`)
    if (!res.ok) throw await toApiError(res)
    return res.json() as Promise<T>
}

export async function httpPost<T = unknown>(url: string, body?: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    })
    if (!res.ok) throw await toApiError(res)
    return res.json() as Promise<T>
}

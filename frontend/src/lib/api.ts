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
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}${url}`)
    if (!res.ok) throw await toApiError(res)
    return res.json() as Promise<T>
}

export async function httpPost<T = unknown>(url: string, body?: unknown): Promise<T> {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    })
    if (!res.ok) throw await toApiError(res)
    return res.json() as Promise<T>
}

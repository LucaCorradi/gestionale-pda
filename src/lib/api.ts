export async function httpGet<T = unknown>(url: string): Promise<T> {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}${url}`)
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return res.json() as Promise<T>
}

export async function httpPost<T = unknown>(url: string, body?: unknown): Promise<T> {
    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
    })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return res.json() as Promise<T>
}
export const OperationTypeName = {
    MOVIMENTA_SCARICO: "Movimenta Scarico",
    MOVIMENTA_CARICO: "Movimenta Carico",
    SPOSTAMENTO_MAGAZZINO: "Spostamento Magazzino",
    CARICO_FORNITORE: "Carico Fornitore",
} as const

export type OperationTypeName = typeof OperationTypeName[keyof typeof OperationTypeName]

export type ChartFiltersSnapshot = {
    productCode: string | null
    from: string | null
    to: string | null
    isReady: boolean
}

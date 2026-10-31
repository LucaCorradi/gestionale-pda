export const OperationTypeName = {
    MOVIMENTA_SCARICO: "Movimenta Scarico",
    MOVIMENTA_CARICO: "Movimenta Carico",
    SPOSTAMENTO_MAGAZZINO: "Spostamento Magazzino",
    CARICO_FORNITORE: "Carico Fornitore",
} as const

export type OperationTypeName = typeof OperationTypeName[keyof typeof OperationTypeName]

// Scritta mostrata all'operatore: il nome nel database resta quello tecnico (decide il documento in Passepartout),
// sul palmare si usa il linguaggio della cucina (richiesta del titolare, 31/10/2026)
const etichetteOperazione: Record<OperationTypeName, string> = {
    [OperationTypeName.MOVIMENTA_SCARICO]: "Prendo per usare",
    [OperationTypeName.MOVIMENTA_CARICO]: "Carico un piatto che ho fatto",
    [OperationTypeName.SPOSTAMENTO_MAGAZZINO]: "Spostamento magazzino",
    [OperationTypeName.CARICO_FORNITORE]: "Carico fornitore",
}

export const etichettaOperazione = (nome: OperationTypeName) => etichetteOperazione[nome] ?? nome

export type ChartFiltersSnapshot = {
    productCode: string | null
    from: string | null
    to: string | null
    isReady: boolean
}

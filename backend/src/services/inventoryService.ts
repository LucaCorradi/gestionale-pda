import { ConflictError } from "../errors/conflict";
import { InventoryConfirmRequest, InventoryConfirmResponse, InventoryPreviewRequest, InventoryRow } from "../schemas/inventorySchema";
import { appendJsonLog } from "../utils/jsonLog";
import { LoggerHandler } from "../utils/loggerHandler";
import { PassepartoutHandler } from "../utils/passepartout/passepartoutHandler";

/*
    Inventario parziale da palmare. In Passepartout un documento Inventario SOMMA le sue quantità all'inventario
    dell'articolo (provato il 20/10/2026: 3 poi 5 dà 8; accetta anche quantità negative): per portare un articolo alla
    quantità contata si manda la differenza tra contato e giacenza attuale. Gli articoli non contati non si toccano.

    La giacenza si legge al momento della conferma: se tra il conteggio e la conferma si vende un articolo contato, la
    differenza ne tiene conto in modo sbagliato. Per questo si conta a negozio chiuso o un reparto alla volta, confermando subito.
*/

// Al grammo, come le quantità dei documenti del palmare: evita differenze tipo 0.30000000000000004
const round3 = (value: number) => Math.round(value * 1000) / 1000;

export class InventoryService {
    // Due conferme insieme (doppio tocco, due palmari sullo stesso magazzino) leggerebbero la stessa giacenza e
    // registrerebbero due volte la differenza
    private confirming = false;

    public async preview(request: InventoryPreviewRequest): Promise<InventoryRow[]> {
        const counted = new Map<string, number>();
        for (const product of request.Products) {
            counted.set(product.Code, round3((counted.get(product.Code) ?? 0) + product.Quantity));
        }

        const warehouse = await PassepartoutHandler.exactWarehouseName(request.Warehouse);
        const stock = await PassepartoutHandler.getStock([...counted.keys()], warehouse);
        return [...counted.entries()].map(([code, quantity]) => {
            const current = round3(stock.get(code) ?? 0);
            return { Code: code, Counted: quantity, Current: current, Difference: round3(quantity - current) };
        });
    }

    public async confirm(request: InventoryConfirmRequest): Promise<InventoryConfirmResponse> {
        if (this.confirming) {
            throw new ConflictError("C'è già un inventario in conferma: riprova tra qualche secondo");
        }
        this.confirming = true;

        try {
            // Giacenze rilette adesso, non quelle dell'anteprima
            const rows = await this.preview(request);
            const changes = rows.filter(row => row.Difference !== 0);

            const result: InventoryConfirmResponse = {
                Number: null,
                Date: new Date().toISOString().slice(0, 10),
                Warehouse: request.Warehouse,
                EmployeeName: request.EmployeeName,
                Rows: rows
            };

            if (changes.length > 0) {
                const saved = await PassepartoutHandler.putInventory(
                    await PassepartoutHandler.exactWarehouseName(request.Warehouse),
                    request.EmployeeName,
                    changes.map(row => ({ Code: row.Code, Quantity: row.Difference }))
                );
                result.Number = saved.Number;
                result.Date = saved.Date;
            }

            await appendJsonLog(process.env.INVENTORY_LOG_PATH || "./logs/inventories.log", "inventory-log", result);
            LoggerHandler.log(`[inventory]: ${request.Warehouse}, ${rows.length} articoli contati, ${changes.length} differenze, documento ${result.Number ?? "nessuno"}`);

            return result;
        } finally {
            this.confirming = false;
        }
    }
}

import { z } from "zod";
import { employeeSchema, warehouseSchema } from "./operationDetailSchema";

/*
    Inventario parziale da palmare: si contano alcuni articoli di un magazzino e Passepartout viene portato a quelle quantità.
*/

// Quantità contata (0 = contato e non ce n'è più)
const countedProductSchema = z.object({
    Code: z.string().nonempty(),
    Quantity: z.number().nonnegative()
});

export const inventorySetupResponseSchema = z.object({
    Warehouses: z.array(warehouseSchema),
    Employees: z.array(employeeSchema)
});

export const inventoryPreviewRequestSchema = z.object({
    Warehouse: z.string().nonempty(),
    Products: z.array(countedProductSchema).min(1)
});
export type InventoryPreviewRequest = z.infer<typeof inventoryPreviewRequestSchema>;

// Per ogni articolo: contato, quanto risulta in Passepartout adesso e differenza da registrare
export const inventoryRowSchema = z.object({
    Code: z.string().nonempty(),
    Counted: z.number(),
    Current: z.number(),
    Difference: z.number()
});
export type InventoryRow = z.infer<typeof inventoryRowSchema>;

export const inventoryConfirmRequestSchema = inventoryPreviewRequestSchema.extend({
    EmployeeName: z.string().nonempty()
});
export type InventoryConfirmRequest = z.infer<typeof inventoryConfirmRequestSchema>;

export const inventoryConfirmResponseSchema = z.object({
    // null: nessuna differenza, nessun documento creato
    Number: z.number().nullable(),
    Date: z.string().nonempty(),
    Warehouse: z.string().nonempty(),
    EmployeeName: z.string().nonempty(),
    Rows: z.array(inventoryRowSchema)
});
export type InventoryConfirmResponse = z.infer<typeof inventoryConfirmResponseSchema>;

import { z } from "zod";

/*
    REQUEST
*/
export const operationConfirmProductSchema = z.object({
    Code: z.string().nonempty(),
    Quantity: z.number().positive(),
    FridgeUUID: z.uuid()
});
export type OperationConfirmProductRequest = z.infer<typeof operationConfirmProductSchema>;

export const operationConfirmRequestSchema = z.object({
    DepartmentID: z.number().int().positive(),
    OperationTypeID: z.number().int().positive(),
    DocumentDate: z.iso.datetime(),
    DocumentNumber: z.int().positive().optional(),
    EmployeeName: z.string().nonempty(),
    WarehouseFrom: z.string().nonempty().optional(),
    WarehouseTo: z.string().nonempty().optional(),
    Supplier: z.string().nonempty().optional(),
    Products: z.array(operationConfirmProductSchema).min(1),
});
export type OperationConfirmRequest = z.infer<typeof operationConfirmRequestSchema>;

/*
    RESPONSE
*/
export const operationConfirmResponseSchema = z.object({
    OperationType: z.string().nonempty(),
    Number: z.number(),
    Date: z.string().nonempty(),
    EmployeeName: z.string().nonempty(),
    WarehouseFrom: z.string().nonempty().optional(),
    WarehouseTo: z.string().nonempty().optional(),
    Supplier: z.string().nonempty().optional(),
    Products: z.array(operationConfirmProductSchema).min(1)
});
export type OperationConfirmResponse = z.infer<typeof operationConfirmResponseSchema>;
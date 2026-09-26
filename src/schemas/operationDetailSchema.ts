import { z } from "zod";

/*
    REQUESTS
*/
export const operationDetailRequestSchema = z.object({
    OperationTypeID: z.number().int().positive()
});
export type OperationDetailRequest = z.infer<typeof operationDetailRequestSchema>;

/*
    RESPONSE
*/
export const supplierSchema = z.object({
    ID: z.number().int().positive(),
    CompanyName: z.string().nonempty()
});
export type Supplier = z.infer<typeof supplierSchema>;


export const warehouseSchema = z.object({
    Name: z.string().nonempty()
});
export type Warehouse = z.infer<typeof warehouseSchema>;


export const employeeSchema = z.object({
    ID: z.number().int().positive(),
    EmployeeName: z.string().nonempty()
});
export type Employee = z.infer<typeof employeeSchema>;

export const operationDetailResponseSchema = z.object({
    Employees: z.array(employeeSchema).optional(),
    WarehousesFrom: z.array(warehouseSchema).optional(),
    WarehousesTo: z.array(warehouseSchema).optional(),
    Suppliers: z.array(supplierSchema).optional(),
    DocumentNumber: z.int().positive().optional()
});
export type OperationDetailResponse = z.infer<typeof operationDetailResponseSchema>;
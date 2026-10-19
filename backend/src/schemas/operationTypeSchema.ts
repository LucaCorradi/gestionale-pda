import { z } from "zod";
import { OperationTypeName } from "../models/operationTypeEntity";

/*
    REQUESTS
*/
export const operationTypeRequestSchema = z.object({
    DepartmentID: z.number().int().positive()
});
export type OperationTypeRequest = z.infer<typeof operationTypeRequestSchema>;

/*
    RESPONSE
*/
export const operationTypeResponseSchema = z.object({
    ID: z.number().int(),
    Name: z.enum(OperationTypeName),
    Description: z.string().nullable().optional(),
});
export type OperationTypeResponse = z.infer<typeof operationTypeResponseSchema>;
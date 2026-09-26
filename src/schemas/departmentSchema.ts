import { z } from "zod";

/*
    RESPONSE
*/
export const departmentResponseSchema = z.object({
    ID: z.number().int(),
    Name: z.string().min(1).max(255),
    Description: z.string().max(1000).nullable().optional(),
});
export type DepartmentResponse = z.infer<typeof departmentResponseSchema>;
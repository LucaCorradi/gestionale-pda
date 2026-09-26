import { z } from "zod";

/*
    RESPONSE
*/
export const fridgeResponseSchema = z.object({
    Description: z.string().min(1).max(255),
    FridgeUUID: z.uuid(),
});
export type FridgeResponse = z.infer<typeof fridgeResponseSchema>;
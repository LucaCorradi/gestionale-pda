import { z } from "zod";

export const productLookupRequestSchema = z.object({
	Alias: z.number().int().positive()
})
export type ProductLookupRequest = z.infer<typeof productLookupRequestSchema>;

export const productLookupResponseSchema = z.object({
	Code: z.string().nonempty(),
	Name: z.string().nonempty(),
	UnitOfMeasure: z.string().nonempty(),
	Price: z.string().nonempty(),
	FridgeUUID: z.string().nullable()
});
export type ProductLookupResponse = z.infer<typeof productLookupResponseSchema>;
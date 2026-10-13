import { z } from "zod";

// L'alias può essere qualsiasi codice (EAN, PLU, alfanumerico), non solo un numero
export const productLookupRequestSchema = z.object({
	Alias: z.string().trim().min(1).max(40)
})
export type ProductLookupRequest = z.infer<typeof productLookupRequestSchema>;

export const productAliasSchema = z.object({
	Code: z.string(),
	Type: z.string()
});
export type ProductAlias = z.infer<typeof productAliasSchema>;

export const productLookupResponseSchema = z.object({
	Code: z.string().nonempty(),
	Name: z.string().nonempty(),
	UnitOfMeasure: z.string().nonempty(),
	Price: z.string().nonempty(),
	FridgeUUID: z.string().nullable(),
	VatRate: z.string().nullable().default(null),
	Category: z.string().nullable().default(null),
	IsActive: z.boolean().default(true),
	// EAN-8 dell'etichetta; null se il codice non è di 5 cifre (es. articoli a peso "PLU 0085")
	LabelBarcode: z.string().nullable().default(null),
	// Quantità letta da un barcode a quantità variabile; null per ogni altra ricerca
	Quantity: z.number().nullable().default(null),
	Aliases: z.array(productAliasSchema).default([])
});
export type ProductLookupResponse = z.infer<typeof productLookupResponseSchema>;

import { z } from "zod";

// L'alias può essere qualsiasi codice (EAN, PLU, alfanumerico): niente più solo numeri.
// Un vecchio client può ancora inviare l'alias come numero: lo convertiamo in testo (z.coerce trasformerebbe anche undefined in "undefined").
export const productLookupRequestSchema = z.object({
	Alias: z.preprocess(
		(value) => typeof value === "number" ? String(value) : value,
		z.string().trim().min(1).max(40)
	)
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
	VatRate: z.string().nullable(),
	Category: z.string().nullable(),
	IsActive: z.boolean(),
	// EAN-8 dell'etichetta (prefisso + codice interno + controllo); null se il codice non è di 5 cifre (es. articoli a peso "PLU 0085")
	LabelBarcode: z.string().nullable(),
	// Quantità letta da un barcode a quantità variabile (nell'unità di misura dell'articolo); null per ogni altra ricerca
	Quantity: z.number().nullable(),
	Aliases: z.array(productAliasSchema)
});
export type ProductLookupResponse = z.infer<typeof productLookupResponseSchema>;

import { z } from "zod";
import { ALIAS_TYPE_NAMES, UNITS_OF_MEASURE } from "../utils/passepartout/article/articleCatalog";

/*
    Ricerca, creazione, modifica e aggiunta alias per gli articoli (le lookup per alias stanno in productLookupSchema).
*/

const aliasCodeSchema = z.string().trim().min(1).max(40);
const aliasTypeSchema = z.enum(ALIAS_TYPE_NAMES);
// Prezzo di vendita IVA inclusa, in euro
const salePriceSchema = z.number().min(0).max(99999).multipleOf(0.01);

/*
    REQUEST
*/
export const productSearchRequestSchema = z.object({
    Query: z.string().trim().min(2).max(60)
});
export type ProductSearchRequest = z.infer<typeof productSearchRequestSchema>;

export const productByCodeRequestSchema = z.object({
    Code: z.string().trim().min(1).max(40)
});
export type ProductByCodeRequest = z.infer<typeof productByCodeRequestSchema>;

export const productCreateRequestSchema = z.object({
    Name: z.string().trim().min(2).max(80),
    UnitOfMeasure: z.enum(UNITS_OF_MEASURE),
    VatRate: z.string().trim().min(1),
    CategoryCode: z.string().trim().min(1).nullable().optional(),
    // Facoltativo: senza prezzo l'articolo nasce a 0 e lo imposta l'ufficio
    SalePrice: salePriceSchema.nullable().optional(),
    Aliases: z.array(z.object({
        Code: aliasCodeSchema,
        Type: aliasTypeSchema.default("Generico")
    })).max(10).default([])
});
export type ProductCreateRequest = z.infer<typeof productCreateRequestSchema>;

// Modifica dei dati principali: si mandano sempre tutti, il backend scrive solo quelli cambiati
export const productUpdateRequestSchema = z.object({
    Code: z.string().trim().min(1).max(40),
    Name: z.string().trim().min(2).max(80),
    VatRate: z.string().trim().min(1),
    CategoryCode: z.string().trim().min(1).nullable(),
    SalePrice: salePriceSchema,
    // Elenco completo degli alias voluti: quelli che mancano si tolgono, i nuovi si aggiungono di tipo Generico
    Aliases: z.array(aliasCodeSchema).max(20)
});
export type ProductUpdateRequest = z.infer<typeof productUpdateRequestSchema>;

export const productAddAliasRequestSchema = z.object({
    Code: z.string().trim().min(1).max(40),
    AliasCode: aliasCodeSchema,
    AliasType: aliasTypeSchema.default("Generico")
});
export type ProductAddAliasRequest = z.infer<typeof productAddAliasRequestSchema>;

export const productPrintLabelRequestSchema = z.object({
    Code: z.string().trim().min(1).max(40),
    Copies: z.number().int().min(1).max(100)
});
export type ProductPrintLabelRequest = z.infer<typeof productPrintLabelRequestSchema>;

/*
    RESPONSE
*/
export const productPrintLabelResponseSchema = z.object({
    Code: z.string(),
    Barcode: z.string(),
    Copies: z.number()
});
export type ProductPrintLabelResponse = z.infer<typeof productPrintLabelResponseSchema>;

export const productSearchResponseSchema = z.object({
    Code: z.string(),
    Name: z.string(),
    IsActive: z.boolean()
});
export type ProductSearchResponse = z.infer<typeof productSearchResponseSchema>;

export const productCatalogResponseSchema = z.object({
    UnitsOfMeasure: z.array(z.string()),
    VatRates: z.array(z.string()),
    AliasTypes: z.array(z.string()),
    Categories: z.array(z.object({
        Code: z.string(),
        Description: z.string(),
        ParentDescription: z.string().nullable()
    }))
});
export type ProductCatalogResponse = z.infer<typeof productCatalogResponseSchema>;

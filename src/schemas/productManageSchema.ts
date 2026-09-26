import { z } from "zod";
import { ALIAS_TYPE_NAMES, UNITS_OF_MEASURE } from "../utils/passepartout/article/articleCatalog";

/*
    Ricerca, creazione e aggiunta alias per gli articoli (le lookup per alias stanno in productLookupSchema).
*/

const aliasCodeSchema = z.string().trim().min(1).max(40);
const aliasTypeSchema = z.enum(ALIAS_TYPE_NAMES);

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
    Aliases: z.array(z.object({
        Code: aliasCodeSchema,
        Type: aliasTypeSchema.default("Generico")
    })).min(1).max(10)
});
export type ProductCreateRequest = z.infer<typeof productCreateRequestSchema>;

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

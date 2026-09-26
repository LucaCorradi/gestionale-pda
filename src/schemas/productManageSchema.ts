import { z } from "zod";

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
    UnitOfMeasure: z.string().nonempty(),
    VatRate: z.string().nonempty(),
    CategoryCode: z.string().nonempty().nullable().optional(),
    Aliases: z.array(z.object({
        Code: z.string().trim().min(1).max(40),
        Type: z.string().nonempty()
    })).min(1).max(10)
});
export type ProductCreateRequest = z.infer<typeof productCreateRequestSchema>;

export const productAddAliasRequestSchema = z.object({
    Code: z.string().trim().min(1).max(40),
    AliasCode: z.string().trim().min(1).max(40),
    AliasType: z.string().nonempty()
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

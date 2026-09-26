import { z } from "zod";

/*
    REQUEST
*/
export const fridgeChartRequestSchema = z.object({
    ProductCode: z.string(),
    FromDate: z.iso.datetime(),
    ToDate: z.iso.datetime()
});
export type FridgeChartRequest = z.infer<typeof fridgeChartRequestSchema>;

/*
    RESPONSE
*/

const metadataChartSchema = z.object({
    FridgeNames: z.array(z.string())
})

const dataChartSchema = z.array(z.number().nullable());

export const fridgeChartResponseSchema = z.object({
    Metadata: metadataChartSchema,
    Data: z.array(dataChartSchema)
})
export type FridgeChart = z.infer<typeof fridgeChartResponseSchema>;
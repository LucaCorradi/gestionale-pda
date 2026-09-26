import express from 'express';
import { inputValidationMiddleware, outputValidationMiddleware } from '../middlewares/validationMiddleware';
import { ProductLookupRequest, productLookupRequestSchema, productLookupResponseSchema } from '../schemas/productLookupSchema';
import { PassepartoutHandler } from '../utils/passepartout/passepartoutHandler';
import { FridgeService } from '../services/fridgeService';

export const productRoutes = express.Router();

const fridgeService = new FridgeService();

productRoutes.post('/lookup', inputValidationMiddleware(productLookupRequestSchema), outputValidationMiddleware(productLookupResponseSchema), async (req, res, next) => {
    try {
        const payload = req.body as ProductLookupRequest;
        const product = await PassepartoutHandler.getProductByAlias(payload.Alias);

        const lastFridgeUUID = await fridgeService.getLastFridgeUUIDByProductCode(product.Code);
        product.FridgeUUID = lastFridgeUUID;

        res.json(product);
    } catch (error) {
        next(error);
    }
});
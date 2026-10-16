import express from 'express';
import { inputValidationMiddleware, outputValidationMiddleware } from '../middlewares/validationMiddleware';
import { ProductLookupRequest, ProductLookupResponse, productLookupRequestSchema, productLookupResponseSchema } from '../schemas/productLookupSchema';
import {
    ProductAddAliasRequest, productAddAliasRequestSchema,
    ProductByCodeRequest, productByCodeRequestSchema,
    ProductCreateRequest, productCreateRequestSchema,
    ProductSearchRequest, productSearchRequestSchema, productSearchResponseSchema,
    ProductUpdateRequest, productUpdateRequestSchema,
    ProductPrintLabelRequest, productPrintLabelRequestSchema, productPrintLabelResponseSchema,
    productCatalogResponseSchema
} from '../schemas/productManageSchema';
import { labelService } from '../services/labelService';
import { PassepartoutHandler } from '../utils/passepartout/passepartoutHandler';
import { FridgeService } from '../services/fridgeService';
import { productService } from '../services/productService';

export const productRoutes = express.Router();

const fridgeService = new FridgeService();

// Aggiunge l'ultimo frigo in cui il prodotto è stato messo (il palmare lo propone precompilato)
const withLastFridge = async (product: ProductLookupResponse): Promise<ProductLookupResponse> => {
    product.FridgeUUID = await fridgeService.getLastFridgeUUIDByProductCode(product.Code);
    return product;
};

productRoutes.post('/lookup', inputValidationMiddleware(productLookupRequestSchema), outputValidationMiddleware(productLookupResponseSchema), async (req, res, next) => {
    try {
        const payload = req.body as ProductLookupRequest;
        // getProductByAlias lancia NotFoundError (404) se nessun articolo ha quell'alias
        const product = await PassepartoutHandler.getProductByAlias(payload.Alias);

        res.json(await withLastFridge(product));
    } catch (error) {
        next(error);
    }
});

productRoutes.post('/by-code', inputValidationMiddleware(productByCodeRequestSchema), outputValidationMiddleware(productLookupResponseSchema), async (req, res, next) => {
    try {
        const payload = req.body as ProductByCodeRequest;
        const product = await productService.getByCode(payload.Code);

        res.json(await withLastFridge(product));
    } catch (error) {
        next(error);
    }
});

productRoutes.post('/search', inputValidationMiddleware(productSearchRequestSchema), outputValidationMiddleware(productSearchResponseSchema), async (req, res, next) => {
    try {
        const payload = req.body as ProductSearchRequest;
        res.json(await productService.searchByDescription(payload.Query));
    } catch (error) {
        next(error);
    }
});

productRoutes.get('/catalog', outputValidationMiddleware(productCatalogResponseSchema), async (req, res, next) => {
    try {
        res.json(await productService.getCatalog());
    } catch (error) {
        next(error);
    }
});

productRoutes.post('/create', inputValidationMiddleware(productCreateRequestSchema), outputValidationMiddleware(productLookupResponseSchema), async (req, res, next) => {
    try {
        const payload = req.body as ProductCreateRequest;
        res.json(await withLastFridge(await productService.createProduct(payload)));
    } catch (error) {
        next(error);
    }
});

productRoutes.post('/update', inputValidationMiddleware(productUpdateRequestSchema), outputValidationMiddleware(productLookupResponseSchema), async (req, res, next) => {
    try {
        const payload = req.body as ProductUpdateRequest;
        res.json(await withLastFridge(await productService.updateProduct(payload)));
    } catch (error) {
        next(error);
    }
});

productRoutes.post('/print-label', inputValidationMiddleware(productPrintLabelRequestSchema), outputValidationMiddleware(productPrintLabelResponseSchema), async (req, res, next) => {
    try {
        const payload = req.body as ProductPrintLabelRequest;
        res.json(await labelService.printProductLabel(payload.Code, payload.Copies));
    } catch (error) {
        next(error);
    }
});

productRoutes.post('/add-alias', inputValidationMiddleware(productAddAliasRequestSchema), outputValidationMiddleware(productLookupResponseSchema), async (req, res, next) => {
    try {
        const payload = req.body as ProductAddAliasRequest;
        res.json(await withLastFridge(await productService.addAlias(payload)));
    } catch (error) {
        next(error);
    }
});

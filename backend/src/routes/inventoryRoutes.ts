import express from 'express';
import { inputValidationMiddleware, outputValidationMiddleware } from '../middlewares/validationMiddleware';
import { InventoryConfirmRequest, InventoryPreviewRequest, inventoryConfirmRequestSchema, inventoryConfirmResponseSchema, inventoryPreviewRequestSchema, inventoryPreviewResponseSchema, inventorySetupResponseSchema } from '../schemas/inventorySchema';
import { InventoryService } from '../services/inventoryService';
import { PassepartoutHandler } from '../utils/passepartout/passepartoutHandler';

export const inventoryRoutes = express.Router();

const inventoryService = new InventoryService();

// Magazzini e dipendenti per iniziare un inventario
inventoryRoutes.get('/setup', outputValidationMiddleware(inventorySetupResponseSchema), async (req, res, next) => {
    try {
        const [Warehouses, Employees] = await Promise.all([PassepartoutHandler.getWarehouses(), PassepartoutHandler.getEmployees()]);
        res.json({ Warehouses, Employees });
    } catch (error) {
        next(error);
    }
});

// Riepilogo prima della conferma: contato, giacenza attuale, differenza
inventoryRoutes.post('/preview', inputValidationMiddleware(inventoryPreviewRequestSchema), outputValidationMiddleware(inventoryPreviewResponseSchema), async (req, res, next) => {
    try {
        res.json(await inventoryService.preview(req.body as InventoryPreviewRequest));
    } catch (error) {
        next(error);
    }
});

// Crea il documento Inventario in Passepartout con le differenze
inventoryRoutes.post('/confirm', inputValidationMiddleware(inventoryConfirmRequestSchema), outputValidationMiddleware(inventoryConfirmResponseSchema), async (req, res, next) => {
    try {
        res.json(await inventoryService.confirm(req.body as InventoryConfirmRequest));
    } catch (error) {
        next(error);
    }
});

import { outputValidationMiddleware } from './../middlewares/validationMiddleware';
import express from 'express';
import { OperationService } from '../services/operationService';
import { inputValidationMiddleware } from '../middlewares/validationMiddleware';
import { OperationTypeRequest, operationTypeRequestSchema, operationTypeResponseSchema } from '../schemas/operationTypeSchema';
import { OperationDetailRequest, operationDetailRequestSchema, operationDetailResponseSchema } from '../schemas/operationDetailSchema';
import { OperationConfirmRequest, operationConfirmRequestSchema, operationConfirmResponseSchema } from '../schemas/operationConfirmSchema';
import { departmentResponseSchema } from '../schemas/departmentSchema';
import { fridgeResponseSchema } from '../schemas/fridgeSchema';
import { FridgeService } from '../services/fridgeService';
import { DataSource } from 'typeorm';

export const operationRoutes = express.Router();

const operationService = new OperationService();
const fridgeService = new FridgeService();

operationRoutes.get('/departments', outputValidationMiddleware(departmentResponseSchema), async (req, res, next) => {
    try {
        const departments = await operationService.getAllDepartments();
        res.json(departments);
    } catch (error) {
        next(error);
    }
});

operationRoutes.get('/fridges', outputValidationMiddleware(fridgeResponseSchema), async (req, res, next) => {
    try {
        const fridges = await fridgeService.getFridges();
        res.json(fridges);
    } catch (error) {
        next(error);
    }
});

operationRoutes.post('/operation-types', inputValidationMiddleware(operationTypeRequestSchema), outputValidationMiddleware(operationTypeResponseSchema), async (req, res, next) => {
    try {
        const payload = req.body as OperationTypeRequest;
        const operationTypes = await operationService.getOperationTypesByDepartmentID(payload.DepartmentID);
        res.json(operationTypes);
    } catch (error) {
        next(error);
    }
});

operationRoutes.post('/operation-details', inputValidationMiddleware(operationDetailRequestSchema), outputValidationMiddleware(operationDetailResponseSchema), async (req, res, next) => {
    try {
        const payload = req.body as OperationDetailRequest;
        const operationDetails = await operationService.getOperationDetailsByOperationTypeID(payload.OperationTypeID);
        res.json(operationDetails);
    } catch (error) {
        next(error);
    }
});

operationRoutes.post('/confirm', inputValidationMiddleware(operationConfirmRequestSchema), outputValidationMiddleware(operationConfirmResponseSchema), async (req, res, next) => {
    try {
        const payload = req.body as OperationConfirmRequest;
        const result = await operationService.confirmOperation(payload);
        res.json(result);
    } catch (error) {
        next(error);
    }
});
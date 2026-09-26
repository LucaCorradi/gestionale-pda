import { ZodObject, ZodTypeAny, z } from "zod";
import { Request, Response, NextFunction } from "express";
import { BadRequestError } from "../errors/badRequest";
import { InternalServerError } from "../errors/internalServer";

export const inputValidationMiddleware = (schema: ZodObject) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const parsed = schema.safeParse(req.body);
        
        if (!parsed.success) {
            res.status(400);

            const issues = parsed.error.issues.map(issue => ({
                path: issue.path.join('.'),
                message: issue.message,
                code: issue.code
            }));

            throw new BadRequestError(
                issues.map(i => `[${i.path}] ${i.message}`).join(', ')
            );
        }

        req.body = parsed.data;

        next();
    }
};

export const outputValidationMiddleware = (schema: ZodTypeAny) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const arraySchema = z.array(schema);
        
        const originalJson = res.json.bind(res);

        res.json = (data: unknown) => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return originalJson(data);
            }

            const parsed = Array.isArray(data) ? arraySchema.safeParse(data) : schema.safeParse(data);
            if (!parsed.success) {
                res.status(500);

                const issues = parsed.error.issues.map(issue => ({
                    path: issue.path.join('.'),
                    message: issue.message,
                    code: issue.code
                }));

                throw new InternalServerError(
                    issues.map(i => `[${i.path}] ${i.message}`).join(', ')
                );
            }

            return originalJson(parsed.data);
        };

        next();
  };
};
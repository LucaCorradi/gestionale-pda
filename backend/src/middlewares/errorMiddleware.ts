import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../errors/http';
export const errorMiddleware = (err: HttpError, req: Request, res: Response, next: NextFunction) => {
    const statusCode = err.status || 500;
    const message = err.message || 'Internal Server Error';
    const errors = err.errors;

    const errorObject = {
        status: statusCode,
        message: message,
        errors: errors ?? null
    }

    res.status(statusCode).json(errorObject);
};

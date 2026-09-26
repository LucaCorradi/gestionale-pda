export class HttpError extends Error {
    status: number;
    errors?: { [key: string]: any } = {};
    
    constructor(message: string, status: number, errors?: { [key: string]: any }) {
        super(message);
        this.status = status;
        this.errors = errors || {};
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
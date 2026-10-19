import { HttpError } from "./http";

export class ConflictError extends HttpError {
    constructor(message: string, errors?: { [key: string]: any }) {
        super(message, 409, errors);
    }
}

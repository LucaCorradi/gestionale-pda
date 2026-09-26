import { HttpError } from "./http";

export class UnauthorizedError extends HttpError {
    constructor(message: string) {
        super(message, 401);
    }
}
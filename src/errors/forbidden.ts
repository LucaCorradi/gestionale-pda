import { HttpError } from "./http";

export class ForbiddenError extends HttpError {
    constructor(message: string) {
        super(message, 403);
    }
}
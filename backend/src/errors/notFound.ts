import { HttpError } from "./http";

export class NotFoundError extends HttpError {
    constructor(message: string) {
        super(message, 404);
    }
}
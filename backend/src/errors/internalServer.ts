import { HttpError } from "./http";

export class InternalServerError extends HttpError {
    constructor(message: string) {
        super(message, 500);
    }
}
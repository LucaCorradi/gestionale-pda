import { HttpError } from "./http";

export class BadRequestError extends HttpError {
    constructor(message: string, errors?: { [key: string]: any}) {
        super(message, 400, errors)
    }
}
export class LoggerHandler {
    private static getTimestamp(): string {
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    }

    public static log(message: string): void {
        console.log(`%c[LOG - ${this.getTimestamp()}]${message}`, 'color: green;');
    }

    public static warn(message: string): void {
        console.warn(`%c[WARN - ${this.getTimestamp()}]${message}`, 'color: orange;');
    }

    public static error(message: string): void {
        console.error(`%c[ERROR - ${this.getTimestamp()}]${message}`, 'color: red;');
    }

    public static debug(message: string): void {
        console.debug(`%c[DEBUG - ${this.getTimestamp()}]${message}`, 'color: purple;');
    }
}
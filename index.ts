import * as util from 'util';
import * as express from 'express';

const nope = (x: never) => {};

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'noop';
export interface LoogerOptions {
	level?: LogLevel;
    colorize?: boolean;
    maxDepth?: number;
    timestamps?: boolean | 'simple';
    writer?: LogWriter;
    enabled?: boolean;
}
export interface LogWriter {
	write(message: string): void;
}
export interface MiddlewareOptions {
    slowThreshold?: number;
    userAgent?: boolean;
    requestSize?: boolean;
    responseSize?: boolean;
    response4xxLevel?: LogLevel;
    response5xxLevel?: LogLevel;
}

const levelMap: Record<LogLevel, number> = {
    trace: 1,
    debug: 2,
    info: 3,
    warn: 4,
    error: 5,
	noop: Infinity,
};

const pad = (value: string | number, count?: number): string =>
	`${'0'.repeat(Math.max(0, (count || 2) - value.toString().length))}${value}`;

const colorMap = {
    bold: 1,
    dim: 2,
    red: 31,
    green: 32,
    yellow: 33,
    blue: 34,
    magenta: 35,
    cyan: 36
} as const;

type ColorName = keyof typeof colorMap;

export class Looger {
    private readonly level: number;
    private readonly colorize: boolean;
    private readonly maxDepth: number;
    private readonly timestamps: boolean | 'simple';
	private readonly writer: LogWriter;
	private isEnabled: boolean;

    public static readonly noop = new Looger({
        writer: {
            write: () => {},
        },
    });

    public constructor(options: LoogerOptions = {}) {
        this.level = options.level ? levelMap[options.level] : levelMap.info;
        this.colorize = options.colorize !== false;
        this.maxDepth = typeof(options.maxDepth) === 'number' ?
            options.maxDepth :
            3;
        this.timestamps = typeof(options.timestamps) !== 'undefined' ? options.timestamps : 'simple';
        this.writer = options.writer || process.stdout;
        this.isEnabled = typeof(options.enabled) === 'boolean' ? options.enabled : true;
    }

    public get enabled(): boolean {
        return this.isEnabled;
    }

    public set enabled(isEnabled: boolean) {
        this.isEnabled = isEnabled;
    }

    protected write(str: string): void {
        this.writer.write(str);
    }

    protected writeLn(str: string): void {
        this.write(`${str}\n`);
    }

    public getDate(): Date {
        return new Date();
    }

    protected colorWrap(color: ColorName | null, str: string): string {
        if (color === null || !this.colorize) {
            return str;
        }

        const a = colorMap[color];
        return `\u001b[${a}m${str}\u001b[0m`;
    }

    protected formatObject(obj: unknown): string {
        const type = typeof(obj);
        switch (type) {
            case 'undefined':
                return this.colorWrap('dim', '<undefined>');
            case 'object':
            case 'function':
            case 'symbol':
                if (obj === null) {
                    return this.colorWrap('dim', '<null>');
                }
                return util.inspect(obj, false, this.maxDepth, this.colorize);
            case 'number':
            case 'bigint':
                return this.colorWrap('yellow', (obj as number).toString());
            case 'boolean':
                return this.colorWrap('blue', (obj as boolean).toString());
            case 'string':
                return obj as string;
            default:
                nope(type);
                return String(obj);
        }
    }

    protected formatLevel(levelName: LogLevel): string {
        if (!this.colorize) {
            return `${levelName}: `;
        }

        let color: ColorName | null = null;

        switch (levelName) {
            case 'trace': color = 'dim'; break;
            case 'debug': color = 'cyan'; break;
            case 'info': color = 'green'; break;
            case 'warn': color = 'yellow'; break;
            case 'error': color = 'red'; break;
        }

        return this.colorWrap(color, levelName + ':') + ' ';
    }

    protected formatTimestamp(date: Date): string {
        if (this.timestamps === false) {
            return '';
        }

        let timestamp = '';
        const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.` +
            `${pad(date.getMilliseconds(), 3)}`;
        switch (this.timestamps) {
            case 'simple':
                timestamp = time;
                break;
            case true:
                timestamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
                    `${time}`;
                break;
            default:
                nope(this.timestamps);
                break;
        }

        return timestamp + ' ';
    }

    protected formatMessage(levelName: LogLevel, message: unknown): string {
        const level = this.formatLevel(levelName);
        const timestamp = this.formatTimestamp(this.getDate());
        return `${timestamp}${level}${message}`;
    }

    public log(levelName: LogLevel, ...messages: unknown[]): void {
        if (!this.enabled) {
            return;
        }

        const level = levelMap[levelName] || Infinity;
        if (this.level <= level) {
            const combinedObjects = messages
                .map(obj => this.formatObject(obj))
                .join(' ');

            if (combinedObjects) {
                this.writeLn(this.formatMessage(levelName, combinedObjects));
            }
        }
    }

    public trace(...messages: unknown[]): void {
        this.log('trace', ...messages);
    }

    public debug(...messages: unknown[]): void {
        this.log('debug', ...messages);
    }

    public info(...messages: unknown[]): void {
        this.log('info', ...messages);
    }

    public warn(...messages: unknown[]): void {
        this.log('warn', ...messages);
    }

    public error(...messages: unknown[]): void {
        this.log('error', ...messages);
    }

    public isDebugEnabled(): boolean {
        return this.level <= levelMap.debug;
    }

    // returning "any" stuff here so that there's not a dependency on @types/express
    // in calling code
    public middleware(options: MiddlewareOptions | number = {}): (req: any, res: any, next: any) => void {
        if (typeof(options) === 'number') {
            options = {
                slowThreshold: options,
            };
        }

        const slowThreshold = options.slowThreshold || 500;
        const logUserAgent = options.userAgent === true;
        const logRequestSize = options.requestSize === true;
        const logResponseSize = options.responseSize === true;
        const response4xxLevel = options.response4xxLevel || 'info';
        const response5xxLevel = options.response5xxLevel || 'info';

        return (req: express.Request, res: express.Response, next: express.NextFunction): void => {
            const userAgent = req.get('user-agent');
            const requestSize = req.get('content-length') || (req.socket && req.socket.bytesRead);
            const signature = `${req.method} ${req.url} HTTP/${req.httpVersion}` +
                `${logUserAgent ? ' ' + (userAgent || 'n/a') : ''}` +
                `${logRequestSize ? ' req:' + requestSize : ''}`;

            const start = Date.now();

            this.debug(signature);

            const kindaSlowThreshold = slowThreshold / 2;
            const mehSlowThreshold = slowThreshold / 5;

            res.on('finish', () => {
                const responseSize = res.get('content-length') || 0;
                let elapsed = Date.now() - start;
                let elapsedColor: ColorName | null = null;
                const statusCode = res.statusCode;
                let status = res.statusCode.toString();

                if (this.colorize) {
                    if (elapsed >= slowThreshold) {
                        elapsedColor = 'red';
                    } else if (elapsed >= kindaSlowThreshold) {
                        elapsedColor = 'magenta';
                    } else if (elapsed >= mehSlowThreshold) {
                        elapsedColor = 'cyan';
                    }

                    if (statusCode < 300) {
                        status = this.colorWrap('green', status);
                    } else if (statusCode < 400) {
                        status = this.colorWrap('yellow', status);
                    } else {
                        status = this.colorWrap('red', status);
                    }
                }

                let elapsedStr = elapsed.toString() + 'ms';
                if (elapsedColor) {
                    elapsedStr = this.colorWrap(elapsedColor, elapsedStr);
                }

                const message = `${elapsedStr} ${status} ${signature}` +
                    `${logResponseSize ? ' res:' + responseSize : ''}`;

                if (statusCode < 400) {
                    this.info(message);
                } else if (statusCode < 500) {
                    if (response4xxLevel !== 'noop') {
                        if (typeof (this[response4xxLevel]) === 'function') {
                            this[response4xxLevel](message);
                        } else {
                            this.info(message);
                        }
                    }
                } else {
                    if (response5xxLevel !== 'noop') {
                        if (typeof (this[response5xxLevel]) === 'function') {
                            this[response5xxLevel](message);
                        } else {
                            this.info(message);
                        }
                    }
                }
            });

            next();
        };
    }
}

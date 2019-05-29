type Color = 'bold' | 'dim' | 'red' | 'green' | 'yellow' | 'blue' | 'magenta' | 'cyan';
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

interface LoogerOptions {
	colorize?: boolean
	level?: LogLevel
	maxDepth?: number
	timestamps?: boolean | 'simple'
	writer?: { write: (str) => void }
}

declare class Looger {
	public readonly level: number;
	public readonly colorize: boolean;
	public readonly maxDepth: number;
	public readonly timestamps: boolean | 'simple';
	public readonly writer: { write: (str) => void };
	public enabled: boolean;

	public static readonly noop: Looger;

	constructor(options?: LoogerOptions)

	public write(str: string): void;
	public writeLn(str: string): void;
	public getDate(): Date;
	public colorWrap(color: Color, str: string): string;
	public formatObject(obj: any): string;
	public formatLevel(levelName: LogLevel): string;
	public formatTimestamp(date: Date): string;
	public formatMessage(levelName: LogLevel, message: any): string;
	public log(levelName: LogLevel, ...message: any[]): void;
	public trace(...messages: any[]): void;
	public debug(...messages: any[]): void;
	public info(...messages: any[]): void;
	public warn(...messages: any[]): void;
	public error(...messages: any[]): void;
	public isDebugEnabled(): boolean;
	public middleware(slowThreshold?: number): (req: any, res: any, next: (err?: any) => void) => void;
	public middleware(options?: {
		slowThreshold?: number;
		userAgent?: boolean;
		requestSize?: boolean;
		responseSize?: boolean;
		response4xxLevel?: LogLevel;
		response5xxLevel?: LogLevel;
	}): (req: any, res: any, next: (err?: any) => void) => void;
}

export = Looger;

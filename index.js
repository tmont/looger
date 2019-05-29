const util = require('util');

const levelMap = {
	trace: 1,
	debug: 2,
	info: 3,
	warn: 4,
	error: 5
};

const pad = (value, count) => `${'0'.repeat(Math.max(0, (count || 2) - value.toString().length))}${value}`;

const colorMap = {
	bold: 1,
	dim: 2,
	red: 31,
	green: 32,
	yellow: 33,
	blue: 34,
	magenta: 35,
	cyan: 36
};

class Looger {
	constructor(options) {
		options = options || {};
		this.level = levelMap[options.level] || levelMap.info;
		this.colorize = options.colorize !== false;
		this.maxDepth = typeof(options.maxDepth) === 'number' ?
			options.maxDepth :
			3;
		this.timestamps = ('timestamps' in options) ? options.timestamps : 'simple';
		this.writer = options.writer || process.stdout;
		this.isEnabled = typeof(options.enabled) === 'boolean' ? options.enabled : true;
	}

	get enabled() {
		return this.isEnabled;
	}

	set enabled(isEnabled) {
		this.isEnabled = !!isEnabled;
	}

	write(str) {
		this.writer.write(str);
	}
	writeLn(str) {
		this.write(`${str}\n`);
	}

	getDate() {
		return new Date();
	}

	colorWrap(color, str) {
		if (color === null || !this.colorize) {
			return str;
		}

		const a = colorMap[color];
		return `\u001b[${a}m${str}\u001b[0m`;
	}

	formatObject(obj) {
		switch (typeof(obj)) {
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
				return this.colorWrap('yellow', obj.toString());
			case 'boolean':
				return this.colorWrap('blue', obj.toString());
			case 'string':
				return obj;
			default:
				return String(obj);
		}
	}

	formatLevel(levelName) {
		if (!this.colorize) {
			return `${levelName}: `;
		}

		let color = null;

		switch (levelName) {
			case 'trace': color = 'dim'; break;
			case 'debug': color = 'cyan'; break;
			case 'info': color = 'green'; break;
			case 'warn': color = 'yellow'; break;
			case 'error': color = 'red'; break;
		}

		return this.colorWrap(color, levelName + ':') + ' ';
	}

	formatTimestamp(date) {
		if (!this.timestamps) {
			return '';
		}
		let timestamp = '';
		const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.` +
			`${pad(date.getMilliseconds(), 3)}`;
		switch (this.timestamps) {
			case 'simple':
				timestamp = time;
				break;
			default:
				timestamp = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
					`${time}`;
				break;
		}

		return timestamp + ' ';
	}

	formatMessage(levelName, message) {
		const level = this.formatLevel(levelName);
		const timestamp = this.formatTimestamp(this.getDate());
		return `${timestamp}${level}${message}`;
	}

	log(levelName, ...messages) {
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

	trace(...messages) {
		this.log('trace', ...messages);
	}

	debug(...messages) {
		this.log('debug', ...messages);
	}

	info(...messages) {
		this.log('info', ...messages);
	}

	warn(...messages) {
		this.log('warn', ...messages);
	}

	error(...messages) {
		this.log('error', ...messages);
	}

	isDebugEnabled() {
		return this.level <= levelMap.debug;
	}

	middleware(options = {}) {
		if (typeof(options) === 'number') {
			options = {
				slowThreshold: options
			};
		}

		const slowThreshold = options.slowThreshold || 500;
		const logUserAgent = options.userAgent === true;
		const logRequestSize = options.requestSize === true;
		const logResponseSize = options.responseSize === true;
		const response4xxLevel = options.response4xxLevel || 'info';
		const response5xxLevel = options.response5xxLevel || 'info';

		return (req, res, next) => {
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
				let elapsedColor = '';
				let status = res.statusCode;

				if (this.colorize) {
					if (elapsed >= slowThreshold) {
						elapsedColor = 'red';
					} else if (elapsed >= kindaSlowThreshold) {
						elapsedColor = 'magenta';
					} else if (elapsed >= mehSlowThreshold) {
						elapsedColor = 'cyan';
					}

					if (status < 300) {
						status = this.colorWrap('green', status);
					} else if (status < 400) {
						status = this.colorWrap('yellow', status);
					} else {
						status = this.colorWrap('red', status);
					}
				}

				elapsed += 'ms';
				if (elapsedColor) {
					elapsed = this.colorWrap(elapsedColor, elapsed);
				}

				const message = `${elapsed} ${status} ${signature}` +
					`${logResponseSize ? ' res:' + responseSize : ''}`;

				if (res.statusCode < 400) {
					this.info(message);
				} else if (res.statusCode < 500) {
					if (typeof(this[response4xxLevel]) === 'function') {
						this[response4xxLevel](message);
					} else {
						this.info(message);
					}
				} else {
					if (typeof (this[response5xxLevel]) === 'function') {
						this[response5xxLevel](message);
					} else {
						this.info(message);
					}
				}
			});

			next();
		};
	}
}

Object.defineProperty(Looger, 'noop', {
	value: new Looger({
		writer: { write: () => {} }
	})
});

module.exports = Looger;

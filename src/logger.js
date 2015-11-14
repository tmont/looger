var cluster = require('cluster'),
	util = require('util'),
	chalk = require('chalk'),
	ConsoleTransport = require('./console-transport'),
	loggingColors = require('./colors'),
	winston = require('winston');

function Logger(logger, options) {
	options = options || {};

	this.showPid = !!options.showPid;
	this.logger = logger;
	this.prefix = options.prefix || '';
}

Logger.levels = {
	trace: 4,
	debug: 3,
	info: 2,
	warn: 1,
	error: 0
};

Logger.colors = loggingColors;

winston.addColors(Logger.colors);

Logger.transports = {
	console: function(options) {
		var timestamp = false;
		if (options.timestamps === 'verbose') {
			timestamp = true;
		} else if (options.timestamps === 'quiet') {
			timestamp = function() {
				var date = new Date(),
					ms = date.getMilliseconds().toString();
				ms = ms + new Array((3 - ms.length + 1)).join('0');
				return [ date.getHours(), date.getMinutes(), date.getSeconds() ]
					.map(function(value) {
						return value < 10 ? '0' + value : value;
					})
					.join(':') + '.' + ms;
			};
		}

		return new ConsoleTransport({
			timestamp: timestamp,
			level: options.level,
			colorize: 'colorize' in options ? options.colorize : true
		});
	}
};

Logger.create = function(config) {
	config = config || {};
	var transports = (config.transports || []).map(function(name) {
		if (typeof(name) === 'object') {
			//already a transport
			return name;
		}

		return Logger.transports[name](config);
	});

	if (!transports.length) {
		transports.push(Logger.transports.console(config));
	}

	var logger = new winston.Logger({
		level: config.level,
		levels: Logger.levels,
		transports: transports,
		emitErrs: false
	});

	return new Logger(logger, config);
};

function log(level) {
	return function() {
		var message = [].slice.call(arguments).map(function(arg) {
			if (typeof(arg) === 'object') {
				var message = util.inspect(arg, false, 5, true);
				if (arg && arg.stack) {
					message += '\n' + arg.stack;
				}
				return message;
			}

			return (arg || '').toString();
		}).join(' ');

		var pid = '';
		if (this.showPid) {
			pid = '[' + (cluster.isMaster ? 'master' : cluster.worker.process.pid) + '] ';
		}

		this.logger.log(level, this.prefix + pid + message);
	};
}

Logger.prototype = {
	isDebugEnabled: function() {
		return this.logger.level === 'debug' || this.logger.level === 'trace';
	},
	trace: log('trace'),
	debug: log('debug'),
	info: log('info'),
	warn: log('warn'),
	error: log('error'),
	middleware: function(req, res, next) {
		this.trace('middleware: log');
		var signature = req.method + ' ' + req.url + ' HTTP/' + req.httpVersion,
			start = Date.now(),
			log = this;

		log.info(signature);

		if (!this.isDebugEnabled()) {
			next();
			return;
		}

		res.on('finish', function() {
			var elapsed = (Date.now() - start),
				elapsedColor = '';
			if (elapsed >= 500) {
				elapsedColor = 'red';
			} else if (elapsed >= 250) {
				elapsedColor = 'magenta';
			} else if (elapsed >= 100) {
				elapsedColor = 'cyan';
			}

			elapsed += 'ms';
			if (elapsedColor) {
				elapsed = chalk[elapsedColor](elapsed);
			}

			var status = res.statusCode.toString();
			if (status < 300) {
				status = chalk.green(status);
			} else if (status < 400) {
				status = chalk.yellow(status);
			} else {
				status = chalk.red(status);
			}

			log.debug([ elapsed, status, signature ].join(' '));
		});
		next();
	}
};

Object.defineProperty(Logger, 'noop', {
	value: new Logger({
		log: function(level, message) {},
		on: function() {}
	})
});

module.exports = Logger;

var winston = require('winston'),
	chalk = require('chalk'),
	Transport = winston.Transport,
	loggingColors = require('./colors'),
	util = require('util');

function defaultTimestamp() {
	return new Date().toISOString();
}

/**
 * Transport for writing to the console
 *
 * This overrides winston's builtin console transport to wrap the level
 * strings in brackets. That's it.
 */
function ConsoleTransport(options) {
	Transport.call(this, options);

	this.colorize = 'colorize' in options ? options.colorize : true;
	this.timestamp = typeof options.timestamp !== 'undefined' ? options.timestamp : false;
	this.stdoutStream = options.stdout || process.stdout;
	this.stderrStream = options.stderr || process.stderr;
}

util.inherits(ConsoleTransport, Transport);

ConsoleTransport.prototype.log = function(level, msg, meta, callback) {
	if (this.silent) {
		return callback(null, true);
	}

	var self = this,
		output,
		timestampFn = typeof this.timestamp === 'function'
			? this.timestamp
			: defaultTimestamp,
		timestamp = this.timestamp ? timestampFn() : null;

	var levelMessage = '[' + level + ']';

	if (this.colorize) {
		levelMessage = chalk[loggingColors[level]](levelMessage);
	}

	output = timestamp ? timestamp + ' - ' : '';
	output += levelMessage + ' ';
	output += msg;

	if (level === 'error' || level === 'debug') {
		this.stderrStream.write(output + '\n');
	} else {
		this.stdoutStream.write(output + '\n');
	}

	self.emit('logged');
	callback(null, true);
};

module.exports = ConsoleTransport;

var winston = require('winston'),
    util = require('util'),
    extend = require('extend'),
    childProcess = require('child_process'),
    async = require('async');

//adapted from https://github.com/tmont/winston-syslog
function SyslogTransport(options) {
    options = options || {};
    winston.Transport.call(this, options);
    this.id = options.id || process.title;
}

util.inherits(SyslogTransport, winston.Transport);

extend(SyslogTransport.prototype, {
    name: 'syslog',
    log: function(level, msg, meta, callback) {
        if (this.silent) {
            callback(null, true);
            return;
        }

        var priority = level;
        if (level === 'error') {
            priority = 'err';
        } else if (level === 'warn') {
            priority = 'warning';
        } else if (level === 'trace') {
            priority = 'debug';
        } else if (level === 'info') {
            priority = 'notice';
        }

        var message = msg,
            prepend = '[' + level + '] ';
        if (typeof(meta) === 'string') {
            message += ' ' + meta;
        } else if (meta && typeof(meta) === 'object' && Object.keys(meta).length > 0) {
            message += ' ' + util.inspect(meta, false, 3, false);
        }

        message = message.replace(/\u001b\[(\d+(;\d+)*)?m/g, '');

        //truncate message to a max of 1024 bytes
        //we'll just use characters though, because that's easier
        //plus splitting a 3-byte character into less than 3-bytes
        //wouldn't make a lot of sense anyway
        var messages = [];

        var maxLength = 1024 - prepend.length;
        while (message.length > maxLength) {
            messages.push(prepend + message.substring(0, maxLength));
            message = message.substring(maxLength);
        }

        messages.push(prepend + message);

        var tag = this.id;
        async.each(messages, function(message, next) {
            var args = [
                '-t',
                tag,
                '-p',
                priority,
                message
            ];

            childProcess.spawn('logger', args, next);
        }, function(err) {
            callback(err, !err);
        });
    }
});

module.exports = SyslogTransport;

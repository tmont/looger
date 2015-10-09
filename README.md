# looger
A simple wrapper for the winston logging library. This is mostly just for
my own internal use.

## Installation
```bash
npm install looger
```

## Usage
`looger` comes prewired to log to the console. It also comes with a semi-intelligent
syslog transport.

```javascript
var looger = require('looger');

// with default console transport
var log = looger.Logger.create({
	level: 'info',
	timestamps: 'quiet'
});

// using an existing winston logger
var winston = require('winston');
var logger = new winston.Logger({
	level: 'info',
	transports: [
		new looger.transports.Console({
			timestamp: true,
			level: 'info',
			colorize: true
		})
	]
});
var log = new looger.Logger(logger);
```

Normal log methods exist:

```javascript
log.trace(/* any object or string */);
log.debug(/* any object or string */);
log.info(/* any object or string */);
log.warn(/* any object or string */);
log.error(/* any object or string */);
```

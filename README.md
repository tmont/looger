# looger
A simple logging class with no dependencies. Requires Node `v8.0.0` or higher.

[![Build Status](https://travis-ci.org/tmont/looger.svg?branch=master)](https://travis-ci.org/tmont/looger)
[![NPM version](https://img.shields.io/npm/v/looger.svg)](https://www.npmjs.com/package/looger)

## Installation
```bash
npm install looger
```

## Usage
`looger` comes prewired to log to stdout. If you want to do something
else, you can either pass in a `writer` object or subclass `Looger`
and override the `write()` method.

```javascript
// for TypeScript, import with this:
// import Looger = require('looger');
const Looger = require('looger');
const looger = new Looger();
looger.info('hello world'); // 09:52:27.338 info: hello world
```

Available logging methods:
```javascript
looger.trace(/* any number of objects */);
looger.debug(/* any number of objects */);
looger.info(/* any number of objects */);
looger.warn(/* any number of objects */);
looger.error(/* any number of objects */);

if (looger.isDebugEnabled()) {
  // expensive debug logging here
}
```

Integration with Express middleware:

```javascript
const express = require('express');
const app = express();

app.use(logger.middleware({
    userAgent: false, // set to true to log user agent
    requestSize: false, // set to true to log request size
    responseSize: false, // set to true to log request size
    response4xxLevel: 'info', // log 4xx responses at this level
    response5xxLevel: 'info', // log 5xx responses at this level
}));

// logged for every incoming request:
// debug: GET / HTTP/1.1
// logged for every outgoing response:
// info: 5ms 200 GET / HTTP/1.1
```

### Options
```javascript
{
  // colorize log levels and output	
  colorize: Boolean, // default is true
  // log level
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error', //default is "info"
  // how deep to print nested objects
  maxDepth: Number, // default is 3
  // how to format the time
  timestamps: Boolean | 'simple', // default is "simple"
  // where to write log lines
  writer: { write: (str) => {} } // default is process.stdout
}
```

For normal development, these options are recommended:

```javascript
const looger = new Looger({
  colorize: true,
  level: 'debug',
  recursionDepth: 5,
  timestamps: 'simple'
});
```

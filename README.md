# looger
A simple logging class with no dependencies.

[![NPM version](https://img.shields.io/npm/v/looger.svg)](https://www.npmjs.com/package/looger)

## Installation
```bash
npm install looger
```

## Usage
`looger` comes prewired to log to stdout. If you want to do something
else, you can either pass in a `writer` object or extend the `Looger`
class and override the `write()` method.

Note: in v5.0.0 the export structure changed.

```javascript
const {Looger} = require('looger');
// import {Looger} from 'looger'; // for typescript

// in versions < 5.0.0, do this instead:
// const Looger = require('looger');
// import Looger = require('looger'); // for typescript

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
    slowThreshold: 500, // use color to indicate a "slow" request beyond this threshold (in ms)
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
```typescript
interface LoogerOptions {
    // colorize log levels and output
    colorize?: boolean; // default is true
    
    // log level, "noop" means "don't log anything", see also Looger.noop
    level?: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'noop'; // default is "info"
    
    // how deep to print nested objects
    maxDepth?: number; // default is 3
    
    // how to format the time
    timestamps?: boolean | 'simple'; // default is "simple"
    
    // where to write log lines
    writer?: { write(msg: string): void }; // default is process.stdout
    
    // whether the logger is enabled. if false, then it's basically Looger.noop
    enabled?: boolean; // default is true
}
```

For normal development, these options are recommended:

```javascript
const looger = new Looger({
  colorize: true,
  level: 'debug',
  maxDepth: 5,
  timestamps: 'simple'
});
```

import Looger = require('../');

const looger = new Looger({
	colorize: true,
	level: 'warn',
	maxDepth: 5,
	timestamps: 'simple'
});

looger.debug();
looger.info('hello', 'world');
if (looger.isDebugEnabled()) {
	looger.debug({hello: 'world'});
}

const middleware = looger.middleware();
looger.middleware(2000);
middleware({}, {}, (err) => {
	console.log(err);
});

const noop = Looger.noop;
noop.error('this will not show up');

looger.enabled = true;

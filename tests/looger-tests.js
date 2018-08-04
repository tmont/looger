const path = require('path');
const exec = require('child_process').exec;
const http = require('http');
const expect = require('expect.js');
const express = require('express');
const sinon = require('sinon');
const Looger = require('../');

const escape = s => s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

describe('Looger', () => {
	let looger;
	let writer;

	const verifyLogMessage = (message, callCount) => {
		callCount = callCount || 1;
		expect(writer.write.callCount).to.equal(callCount);
		const regex = new RegExp(escape(message) + '\n$');
		expect(writer.write.getCall(callCount - 1).args[0]).to.match(regex);
	};

	beforeEach(() => {
		writer = {write: sinon.stub()};
	});

	describe('defaults', () => {
		beforeEach(() => {
			looger = new Looger();
		});

		it('should colorize by default', () => {
			expect(looger).to.have.property('colorize', true);
		});

		it('should set maxDepth to 3', () => {
			expect(looger).to.have.property('maxDepth', 3);
		});

		it('should set log level to info', () => {
			expect(looger).to.have.property('level', 3);
		});

		it('should set timestamps to "simple"', () => {
			expect(looger).to.have.property('timestamps', 'simple');
		});

		it('should set enabled to "true"', () => {
			expect(looger).to.have.property('enabled', true);
		});
	});

	describe('disabling', () => {
		it('should not log anything if "enabled" is false', () => {
			const test = (looger) => {
				looger.trace('hello world');
				looger.debug('hello world');
				looger.info('hello world');
				looger.warn('hello world');
				looger.error('hello world');

				expect(writer.write.callCount).to.equal(0);
			};

			test(new Looger({ enabled: false, writer }));
			const looger = new Looger({ writer });
			looger.enabled = false;
			test(looger);
		});
	});

	describe('message formatting without color', () => {
		beforeEach(() => {
			looger = new Looger({
				colorize: false,
				writer
			});
		});

		it('should log nothing for no arguments', () => {
			looger.info();
			expect(writer.write.callCount).to.equal(0);
		});

		it('should format null', () => {
			looger.info(null);
			verifyLogMessage('<null>');
		});

		it('should format undefined', () => {
			looger.info(undefined);
			verifyLogMessage('<undefined>');
		});

		it('should format object literal', () => {
			looger.info({ hello: 'world' });
			verifyLogMessage('{ hello: \'world\' }');
		});

		it('should format deep object literal and not recurse infinitely', () => {
			const obj = {hello: {world: {foo: {bar: {baz: {bat: null}}}}}};
			obj.hello.world.foo.bar.baz.bat = obj;
			looger.info(obj);
			verifyLogMessage('{ hello: { world: { foo: { bar: [Object] } } } }');
		});

		it('should format multiple arguments separately', () => {
			looger.info(true, 'hello', 'world', { foo: 'bar' });
			verifyLogMessage('true hello world { foo: \'bar\' }');
		});

		it('should format symbol', () => {
			looger.info(Symbol('foo'));
			verifyLogMessage('Symbol(foo)');
		});

		it('should format string', () => {
			looger.info('hello world');
			verifyLogMessage('hello world');
		});

		it('should format boolean', () => {
			looger.info(true);
			verifyLogMessage('true');
			looger.info(false);
			verifyLogMessage('false', 2);
		});

		it('should format function', () => {
			looger.info(function foo() {});
			verifyLogMessage('[Function: foo]');
		});
	});

	describe('message formatting with color', () => {
		beforeEach(() => {
			looger = new Looger({
				colorize: true,
				writer
			});
		});

		it('should log nothing for no arguments', () => {
			looger.info();
			expect(writer.write.callCount).to.equal(0);
		});

		it('should format null', () => {
			looger.info(null);
			verifyLogMessage('\u001b[2m<null>\u001b[0m');
		});

		it('should format undefined', () => {
			looger.info(undefined);
			verifyLogMessage('\u001b[2m<undefined>\u001b[0m');
		});

		it('should format object literal', () => {
			looger.info({hello: 'world'});
			verifyLogMessage('{ hello: \u001b[32m\'world\'\u001b[39m }');
		});

		it('should format multiple arguments separately', () => {
			looger.info(true, 'hello', 'world', {foo: 'bar'});
			verifyLogMessage('\u001b[34mtrue\u001b[0m hello world { foo: \u001b[32m\'bar\'\u001b[39m }');
		});

		it('should format symbol', () => {
			looger.info(Symbol('foo'));
			verifyLogMessage('\u001b[32mSymbol(foo)\u001b[39m');
		});

		it('should format string', () => {
			looger.info('hello world');
			verifyLogMessage('hello world');
		});

		it('should format boolean', () => {
			looger.info(true);
			verifyLogMessage('\u001b[34mtrue\u001b[0m');
			looger.info(false);
			verifyLogMessage('\u001b[34mfalse\u001b[0m', 2);
		});

		it('should format function', () => {
			looger.info(function foo() {});
			verifyLogMessage('\u001b[36m[Function: foo]\u001b[39m');
		});
	});

	describe('time formatting', () => {
		beforeEach(() => {
			looger = new Looger({
				colorize: true,
				writer
			});
		});

		it('should format "simple" timestamp', () => {
			writer = {write: sinon.stub()};

			const looger = new Looger({
				colorize: false,
				timestamps: 'simple',
				writer
			});

			const getDate = sinon.stub(looger, 'getDate');
			getDate.returns(new Date(2017, 3, 4, 0, 0, 0, 0));

			looger.info('x');
			expect(writer.write.callCount).to.equal(1);
			expect(writer.write.getCall(0).args[0].substring(0, 12)).to.equal('00:00:00.000');

			getDate.returns(new Date(2017, 3, 4, 1, 2, 3, 4));
			looger.info('x');
			expect(writer.write.callCount).to.equal(2);
			expect(writer.write.getCall(1).args[0].substring(0, 12)).to.equal('01:02:03.004');

			getDate.returns(new Date(2017, 3, 4, 11, 12, 13, 114));
			looger.info('x');
			expect(writer.write.callCount).to.equal(3);
			expect(writer.write.getCall(2).args[0].substring(0, 12)).to.equal('11:12:13.114');
		});

		it('should format verbose timestamp', () => {
			writer = {write: sinon.stub()};

			const looger = new Looger({
				colorize: false,
				timestamps: true,
				writer
			});

			const getDate = sinon.stub(looger, 'getDate');
			getDate.returns(new Date(2017, 3, 4, 0, 0, 0, 0));

			looger.info('x');
			expect(writer.write.callCount).to.equal(1);
			expect(writer.write.getCall(0).args[0].substring(0, 23)).to.equal('2017-04-04 00:00:00.000');

			getDate.returns(new Date(2017, 9, 11, 1, 2, 3, 4));
			looger.info('x');
			expect(writer.write.callCount).to.equal(2);
			expect(writer.write.getCall(1).args[0].substring(0, 23)).to.equal('2017-10-11 01:02:03.004');
		});

		it('should omit timestamp', () => {
			writer = {write: sinon.stub()};

			const looger = new Looger({
				colorize: false,
				timestamps: false,
				writer
			});

			looger.info('x');
			expect(writer.write.callCount).to.equal(1);
			expect(writer.write.getCall(0).args[0]).to.not.match(/^\d/);
		});
	});

	describe('level formatting', () => {
		describe('without color', () => {
			const verifyLevel = (level, callCount) => {
				callCount = callCount || 1;
				expect(writer.write.callCount).to.equal(callCount);
				expect(writer.write.getCall(callCount - 1).args[0].substring(0, level.length + 3)).to.equal(`[${level}] `);
			};
			it('should log "trace" level', () => {
				looger = new Looger({
					colorize: false,
					level: 'trace',
					timestamps: false,
					writer
				});

				looger.trace('x');
				verifyLevel('trace');
				looger.debug('x');
				verifyLevel('debug', 2);
				looger.info('x');
				verifyLevel('info', 3);
				looger.warn('x');
				verifyLevel('warn', 4);
				looger.error('x');
				verifyLevel('error', 5);
			});

			it('should log "debug" level', () => {
				looger = new Looger({
					colorize: false,
					level: 'debug',
					timestamps: false,
					writer
				});

				looger.trace('x');
				expect(writer.write.callCount).to.equal(0);
				looger.debug('x');
				verifyLevel('debug', 1);
				looger.info('x');
				verifyLevel('info', 2);
				looger.warn('x');
				verifyLevel('warn', 3);
				looger.error('x');
				verifyLevel('error', 4);
			});

			it('should log "info" level', () => {
				looger = new Looger({
					colorize: false,
					level: 'info',
					timestamps: false,
					writer
				});

				looger.trace('x');
				expect(writer.write.callCount).to.equal(0);
				looger.debug('x');
				expect(writer.write.callCount).to.equal(0);
				looger.info('x');
				verifyLevel('info', 1);
				looger.warn('x');
				verifyLevel('warn', 2);
				looger.error('x');
				verifyLevel('error', 3);
			});

			it('should log "warn" level', () => {
				looger = new Looger({
					colorize: false,
					level: 'warn',
					timestamps: false,
					writer
				});

				looger.trace('x');
				expect(writer.write.callCount).to.equal(0);
				looger.debug('x');
				expect(writer.write.callCount).to.equal(0);
				looger.info('x');
				expect(writer.write.callCount).to.equal(0);
				looger.warn('x');
				verifyLevel('warn', 1);
				looger.error('x');
				verifyLevel('error', 2);
			});

			it('should log "error" level', () => {
				looger = new Looger({
					colorize: false,
					level: 'error',
					timestamps: false,
					writer
				});

				looger.trace('x');
				expect(writer.write.callCount).to.equal(0);
				looger.debug('x');
				expect(writer.write.callCount).to.equal(0);
				looger.info('x');
				expect(writer.write.callCount).to.equal(0);
				looger.warn('x');
				expect(writer.write.callCount).to.equal(0);
				looger.error('x');
				verifyLevel('error', 1);
			});
		});

		describe('with color', () => {
			const verifyLevel = (level, color, callCount) => {
				callCount = callCount || 1;
				expect(writer.write.callCount).to.equal(callCount);
				const logLine = writer.write.getCall(callCount - 1).args[0];
				const expected = `[${color}${level}\u001b[0m] `;
				expect(logLine.substring(0, level.length + color.length + 7)).to.equal(expected);
			};

			it('should log "trace" level', () => {
				looger = new Looger({
					colorize: true,
					level: 'trace',
					timestamps: false,
					writer
				});

				looger.trace('x');
				verifyLevel('trace', '\u001b[2m');
			});

			it('should log "debug" level', () => {
				looger = new Looger({
					colorize: true,
					level: 'debug',
					timestamps: false,
					writer
				});

				looger.debug('x');
				verifyLevel('debug', '\u001b[36m');
			});

			it('should log "info" level', () => {
				looger = new Looger({
					colorize: true,
					level: 'info',
					timestamps: false,
					writer
				});

				looger.info('x');
				verifyLevel('info', '\u001b[32m');
			});

			it('should log "warn" level', () => {
				looger = new Looger({
					colorize: true,
					level: 'warn',
					timestamps: false,
					writer
				});

				looger.warn('x');
				verifyLevel('warn', '\u001b[33m');
			});

			it('should log "error" level', () => {
				looger = new Looger({
					colorize: true,
					level: 'error',
					timestamps: false,
					writer
				});

				looger.error('x');
				verifyLevel('error', '\u001b[31m');
			});
		});
	});

	describe('express middleware', () => {
		let server;
		let app;
		const port = 23456;

		beforeEach(() => {
			app = express();
			server = app.listen(port);
		});

		afterEach((done) => {
			if (!server) {
				done();
				return;
			}

			server.close(() => {
				server = null;
				done();
			});
		});

		const sendRequest = (callback) => {
			app.use(looger.middleware());
			app.all(/.*/, (req, res) => {
				res.send('ok');
			});
			http.get(`http://localhost:${port}/`, (res) => {
				res.on('data', () => {});
				res.on('end', () => {
					callback();
				});
			});
		};

		it('should log request and response for "debug" level', (done) => {
			looger = new Looger({
				colorize: true,
				level: 'debug',
				timestamps: false,
				writer
			});

			sendRequest(() => {
				expect(writer.write.callCount).to.equal(2);
				expect(writer.write.getCall(0).args[0]).to.equal('[\u001b[36mdebug\u001b[0m] GET / HTTP/1.1\n');
				expect(writer.write.getCall(1).args[0]).to.match(/^\[\u001b\[32minfo\u001b\[0m] \d+ms \u001b\[32m200\u001b\[0m GET \/ HTTP\/1\.1\n$/);
				done();
			});
		});

		it('should log response but not request for "info" level', (done) => {
			looger = new Looger({
				colorize: true,
				level: 'info',
				timestamps: false,
				writer
			});

			sendRequest(() => {
				expect(writer.write.callCount).to.equal(1);
				expect(writer.write.getCall(0).args[0]).to.match(/^\[\u001b\[32minfo\u001b\[0m] \d+ms \u001b\[32m200\u001b\[0m GET \/ HTTP\/1\.1\n$/);
				done();
			});
		});
	});

	describe('TypeScript declarations', () => {
		it('should successfully compile typescript without errors', (done) => {
			const sourceFile = path.join(__dirname, 'test.ts');
			const tsc = path.resolve(path.join(__dirname, '..', 'node_modules', '.bin', 'tsc'));
			const cmd = `"${tsc}" --noEmit ${sourceFile}`;

			exec(cmd, (err, stdout, stderr) => {
				expect(stdout).to.equal('');
				expect(stderr).equal('');
				expect(err).to.equal(null);
				done();
			});
		});
	});
});

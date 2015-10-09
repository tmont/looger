module.exports = {
	Logger: require('./src/logger'),
	colors: require('./src/colors'),
	transports: {
		Console: require('./src/console-transport'),
		Syslog: require('./src/syslog-transport')
	}
};

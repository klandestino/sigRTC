var
	EventEmitter = require('events').EventEmitter,
	P2PChannels = require('../p2pchannels'),
	util = require('util');

function SigRTC() {
	this.p2pChannels = new P2PChannels(),
}

util.inherits(SigRTC, EventEmitter);

SigRTC.prototype.listen = function (s2sPort, dhtPort) {
	if (typeof (s2sPort) === 'undefined') {
		s2sPort = 8099;
	}
	if (typeof (dhtPort) === 'undefined') {
		dhtPort = 55055;
	}
	this.p2pChannels.listen(s2sPort);
	this.p2pChannels.addDiscoveryService(new P2PChannels.BitTorrentDHT(dhtPort));
};

SigRTC.prototype.signaling = function (socket) { // A socket.io socket as argument.
};

module.exports = SigRTC;



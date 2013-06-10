$(document).ready(function() {

	function randStr(length) {
		var result = '';
		var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		for (var i = 0; i < length; i++) {
			result += possible.charAt(Math.floor(Math.random() * possible.length));
		}
		return result;
	}

	// Get room name/identifyer from URL:
	var room = window.location.href.replace(/\/$/, '').split('/');
	room.shift(); room.shift(); room.shift();
	room = room.join('slash').replace(/[^a-z0-9]/g, '');

	if (room == '') {
		window.location.href = '/' + randStr(16);
	}

	// Array of all connections we already have.
	var alreadyconnected = [];

	// Remove the SEO copy and display #content:
	$('#content').html('').show();

	// Permission to use camera and microphone:
	navigator.webkitGetUserMedia({ "audio": true, "video": true }, function(localStream) {

		var newConnection = function() {
			window.turnserversDotComAPI.iceServers(function(data) {
				var peerConnection = new webkitRTCPeerConnection({ iceServers: data }, {optional: [{RtpDataChannels: true}]});
				peerConnection.addStream(localStream);
				peerConnection.onaddstream = function(e) {

					// Add the video element.
					$('#content').append('<video width="160" height="120" src="' + URL.createObjectURL(e.stream) + '" autoplay></video>');

					// Always keep getting more connections.
					newConnection();

				}

				window.SigRTC(peerConnection, 'hangoutplankanu' + room, alreadyconnected, function(id) {
					alreadyconnected.push(id);
				});
			});
		}
		newConnection();

	});
});

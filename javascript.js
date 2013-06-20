$(document).ready(function() {

	var url = window.location.href.split('/');
	if (url.length === 4 && url[3].length === 0) {
		window.location.href = '/' + (Math.PI * Math.max(0.01, Math.random())).toString(36).substr(2, 7);
		return;
	}

	var chatDataChannel;
	var rtcOptions = {
		connect: function(peerConnection) {
			// We want more connections!
			console.log('CONNECTED!');
			chatDataChannel = peerConnection.createDataChannel('chat', { reliable: false });
			chatDataChannel.onopen = function() {
				console.log('Chat Channel Opened!');
				console.dir(chatDataChannel);
			};
			chatDataChannel.onclose = function() {
				console.log('Chat Channel Closed!');
				console.dir(chatDataChannel);
			};
			chatDataChannel.onerror = function() {
				console.log('Chat Channel Error');
				console.dir(chatDataChannel);
			};
			chatDataChannel.onmessage = function(e) {
				$('#msgs').append('<p>' + e.data + '</p>');
			};
		}
	};
	$.sigRTC(rtcOptions);

	$('#chatinput').keyup(function(e) {
		if (e.keyCode == 13) {
			console.dir(chatDataChannel);
			chatDataChannel.send($(this).val());
			$(this).val('');
		}
	});

});

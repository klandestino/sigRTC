
peerConnection = new webkitRTCPeerConnection(null);

document.getElementById('offerButton').onclick = function() {

	peerConnection.createOffer(function(description) {
		peerConnection.setLocalDescription(description);
		document.getElementById('offer').value = JSON.stringify(description);
	});

};

document.getElementById('answerButton').onclick = function() {

	peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(document.getElementById('incomingoffer').value)));

	peerConnection.createAnswer(function(description) {
		peerConnection.setLocalDescription(description);
		document.getElementById('answer').value = JSON.stringify(description);
	});

};

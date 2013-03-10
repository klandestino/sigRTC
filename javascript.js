
peerConnection = new webkitRTCPeerConnection(null);

document.getElementById('offerButton').onclick = function() {

	peerConnection.createOffer(function(description) {
		peerConnection.setLocalDescription(description);
		document.getElementById('offer').value = JSON.stringify(description);
	});

};

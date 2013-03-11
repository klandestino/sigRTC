
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

document.getElementById('getAnswerButton').onclick = function() {

	peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(document.getElementById('incominganswer').value)));

}

peerConnection.onicecandidate = function(e) {
	if (e.candidate != null) {
		document.getElementById('localcandidates').value = document.getElementById('localcandidates').value + JSON.stringify(e.candidate) + "\n";
	}
}

document.getElementById('candidatesButton').onclick = function() {
	candidates = document.getElementById('remotecandidates').value.split("\n");
	for (i in candidates) {
		if (candidates[i] != '') {
			candidate = JSON.parse(candidates[i]);
			peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
		}
	}
}

navigator.webkitGetUserMedia({ "audio": true, "video": true }, function (stream) {
	peerConnection.addStream(stream);
});

peerConnection.onaddstream = function(e) {
	document.getElementById('ljudobild').src = URL.createObjectURL(e.stream);
	console.log('Remote stream added.');
};




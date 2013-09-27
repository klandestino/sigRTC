
peerConnection = new webkitRTCPeerConnection({ iceServers: [ {"url": "stun:stun.l.google.com:19302"} ] }, {optional: [{RtpDataChannels: true}]});

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

function addChatMsg(str) {
	document.getElementById('chatoutput').appendChild(document.createTextNode(str));
	document.getElementById('chatoutput').appendChild(document.createElement('br'));
}
dataChannel = peerConnection.createDataChannel('test', {reliable:false});
document.getElementById('chatinput').onkeyup = function(e) {
	if (e.keyCode == 13) {
		dataChannel.send(document.getElementById('chatinput').value);
		addChatMsg('Jag: ' + document.getElementById('chatinput').value);
		document.getElementById('chatinput').value = '';

	}
}
dataChannel.onmessage = function(e) {
	addChatMsg('Du: ' + e.data);
}




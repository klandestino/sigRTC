window.SigRTC = function(peerConnection, realm, alreadyconnected, connectingCallback) {

	var myCandidates = [];

	(function() {
		var c = [];
		peerConnection.onicecandidate = function(e) {
			if (e.candidate != null) {
				c.push(e.candidate);
			} else {
				myCandidates = c;
				c = [];
			}
		}
	})();

	var findOffer = function(callback) {
		console.log('findOffer();');
		$.ajax({
			data: {
				'realm': realm,
				'act': 'find',
				'alreadyconn': alreadyconnected.join(',')
			},
			dataType: 'json',
			error: function() {
				callback('Ajax error.');
			},
			success: function(data) {
				if (typeof data.sdp == 'undefined' || typeof data.id == 'undefined') {
					callback('Inproper data from server.');
					return;
				}
				callback(null, data.sdp, data.id);
			},
			type: 'POST',
			url: '//sigrtc.turnservers.com/'
		});
	}, sendOffer = function(sdp, callback) {
		console.log('sendOffer();');
		$.ajax({
			data: {
				'realm': realm,
				'act': 'offer',
				'sdp': sdp,
				'alreadyconn': alreadyconnected.join(',')
			},
			dataType: 'json',
			error: function() {
				callback('Ajax error.');
			},
			success: function(data) {
				if (typeof data.id == 'undefined') {
					callback('Some error occured.');
					return;
				}
				callback(null, data.id);
			},
			type: 'POST',
			url: '//sigrtc.turnservers.com/'
		});

	}, waitForAnswer = function(id, callback) {
		console.log('waitForAnswer();');
		$.ajax({
			data: {
				'realm': realm,
				'act': 'wait',
				'id': id
			},
			dataType: 'json',
			error: function() {
				callback('Ajax error.');
			},
			success: function(data) {
				if (typeof data.sdp == 'undefined') {
					callback('No answer in response.');
					return;
				}
				callback(null, data.sdp);
			},
			type: 'POST',
			url: '//sigrtc.turnservers.com/'
		});
	}, sendAnswer = function(sdp, id, callback) {
		console.log('sendAnswer();');
		$.ajax({
			data: {
				'realm': realm,
				'act': 'answer',
				'id': id,
				'sdp': sdp
			},
			dataType: 'json',
			error: function() {
				callback('Ajax error.');
			},
			success: function(data) {
				if (typeof data.candidates == 'undefined') {
					callback('No data received from server.');
					return;
				}
				if (data.candidates.length == 0) {
					callback('Empty candidate array.');
					return;
				}
				callback(null, data.candidates);
			},
			type: 'POST',
			url: '//sigrtc.turnservers.com/'
		});
	}, sendCandidates = function(id, who, callback) {
		console.log('sendCandidates(id=' + id + ');');
		if (myCandidates.length == 0) {
			setTimeout(function() {
				sendCandidates(id, who, callback);
			}, 200);
		} else {
			$.ajax({
				data: {
					'realm': realm,
					'act': 'cand',
					'id': id,
					'who': who,
					'candidates': JSON.stringify(myCandidates)
				},
				dataType: 'json',
				error: function() {
					callback('Ajax error.');
				},
				success: function(data) {
					if (data.candidates) {
						if (callback) callback(null, data.candidates);
					} else {
						if (callback) callback(null);
					}
				},
				type: 'POST',
				url: '//sigrtc.turnservers.com/'
			});
		}
	};

	findOffer(function(err, sdp, id) {
		if (err) {
			console.log('Got no offer.');
			peerConnection.createOffer(function(description) {
				peerConnection.setLocalDescription(description);
				console.log('Created offer.');
				sendOffer(description.sdp, function(err, id) {
					connectingCallback(id);
					console.log('Offer was sent.');
					waitForAnswer(id, function(err, sdp) {
						if (err) {
							console.log('Got no answer.');
							// Something failed.
						} else {
							console.log('Got answer, id: ' + id);

							peerConnection.setRemoteDescription(new RTCSessionDescription({sdp: sdp, type: 'answer'}));
							sendCandidates(id, 'offer', function(err, candidates) {
								if (err) {
									console.log('Error sending/getting candidates.');
									// Some error.
								} else {
									console.log('Got candidates.');
									for (var i = 0; i < candidates.length; i++) {
										if (candidates[i] != '') {
											peerConnection.addIceCandidate(new RTCIceCandidate(candidates[i]));
										}
									}
								}
							});
						}
					});

				});

			});

		} else {
			connectingCallback(id);
			console.log('There was an offer.');
			peerConnection.setRemoteDescription(new RTCSessionDescription({sdp: sdp, type: 'offer'}));
			peerConnection.createAnswer(function(description) {
				console.log('Created answer.');
				peerConnection.setLocalDescription(description);
				sendAnswer(description.sdp, id, function(err, candidates) {
					if (err) {
						console.log('Fail when sending answer.');
					} else {
						console.log('Answer was send, we got candidates in return.');

						for (var i = 0; i < candidates.length; i++) {
							if (candidates[i] != '') {
								peerConnection.addIceCandidate(new RTCIceCandidate(candidates[i]));
							}
						}
						sendCandidates(id, 'answer', function(err) {
							if (err) {
								console.log('Fail when sending my own candidates.');
								// Now what!?
							} else {
								console.log('My own candidates was send.');
								// We are done here.
							}
						});

					}
				});
			});

			
		}
	});

};

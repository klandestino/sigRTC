(function() {

	// Cross-browser hell
	var PeerConnection = window.webkitRTCPeerConnection || window.mozRTCPeerConnection || window.RTCPeerConnection;

	// Is PeerConnection and DataChannel support available at all?
	var supported = (function() {
		if (typeof PeerConnection == 'function' && PeerConnection.prototype && typeof PeerConnection.prototype.createDataChannel == 'function') {
			try {
				var pc = new PeerConnection(null, {optional: [{RtpDataChannels: true}]});
				pc.createDataChannel('feat',{reliable:false}).close()
				delete(pc);
				return true;
			} catch(e){
				return false;
			}
		} else {
			return false;
		}
	}());

	// Array with all id:s of successful connection attempts:
	var alreadyconnected = [];

	var offerer = false; // Was I the one who created an offer? (That means I will continue creating all offers on renegotiations.) Global for all instances.

	var Instance = function(options) {

		var instance = this;

		// The settings...
		var settings = $.extend({
			connect: function(peerConnection) { // Callback when successfully connected.
			},
			error: function(err) { // Callback on errors.
			},
			realm: window.location.href,
			signalingDataChannel: null
		}, options);

		var isSignalingInstance = function () {
			return (settings.signalingDataChannel === null);
		}

		// Run error callback if WebRTC is not supported by browser.
		if (!supported) {
			settings.error('WebRTC not supported.');
			return;
		}

		// Create PeerConnection object:
		var peerConnection;
		if (window.turnserversDotComAPI) {
			window.turnserversDotComAPI.iceServers(function(data) {
				peerConnection = new PeerConnection({ iceServers: data }, {optional: [{RtpDataChannels: true}]});
			});
		} else {
			peerConnection = new PeerConnection({ iceServers: [ { url: 'stun:stun.l.google.com:19302' } ] }, { optional: [ { RtpDataChannels: true } ] });
		}

		// Create signaling data channel.
		// First we are using sigRTC server to create a PeerConnection using server signaling,
		// but when the connection is established, renegotiation will use this signalingDataChannel.
		var signalingDataChannel = instance.signalingDataChannel = settings.signalingDataChannel;
		(function() { // Loads of logic to make non-reliable DataChannelss reliable:
			var channel = peerConnection.createDataChannel('signaling', { reliable: false });
			channel.onopen = function(e) {
				signalingDataChannel.onopen(e);
			};
			var outbuffer = [];
			var outcounter = 0;
			var incounter = 0;
			var inbuffer = [];
			var sendMsgsTimeout = null;
			var sendMsgs = function() {

				clearTimeout(sendMsgsTimeout);
				sendMsgsTimeout = null;

				if (outbuffer.length === 0) return;

				if (channel.readyState === 'open') {
					if (typeof outbuffer[0] === 'string') {
						outbuffer[0] = outbuffer[0].match(/.{1,100}/g);
					}
					for (var i = 0; i < outbuffer[0].length; i++) {
						if (outbuffer[0][i] !== '') {
							try {
								channel.send(outcounter + ':' + i + ':' + outbuffer[0].length + ':' + outbuffer[0][i]);
							} catch(e) {
								//console.log(e);
							}
						}
					}
				}

				(function(oldOutcounter) {
					sendMsgsTimeout = setTimeout(function() {
						if (oldOutcounter === outcounter) {
							console.log('resend: ' + outcounter + ' - outbuffer: ' + outbuffer.length);
							// We are still left here. Resend non ACK-ed!
							sendMsgs();
						} else {
							console.log('successfull send: ' + oldOutcounter);
							sendMsgsTimeout = null;
						}
					}, 1000);

				}(outcounter));

			};
			channel.onmessage = function(e) {
				if (e.data.substr(0, 4) == 'ACK:') {
					var ackParts = e.data.split(':');
					if (ackParts[1] === outcounter.toString()) {
						if (typeof outbuffer[0][parseInt(ackParts[2])] !== 'undefined') outbuffer[0][parseInt(ackParts[2])] = '';
						if (outbuffer[0].join('') === '') { // All was ACK:ed?
							console.log('acked send: ' + outcounter);
							outbuffer.shift();
							outcounter++;
							sendMsgs();
						}
					}
				} else {
					var msgParts = e.data.split(':');
					if (incounter > parseInt(msgParts[0])) {
						try {
							channel.send('ACK:' + msgParts[0] + ':' + msgParts[1]);
						} catch(e) {
							//console.log(e);
						}
						return;
					} else if (incounter.toString() === msgParts[0]) {
						inbuffer[msgParts[1]] = msgParts[3];
						try {
							channel.send('ACK:' + incounter + ':' + msgParts[1]);
						} catch(e) {
							// console.log(e);
						}
						if (inbuffer.length.toString() === msgParts[2]) {
							signalingDataChannel.onmessage({
								data: atob(inbuffer.join(''))
							});
							inbuffer = [];
							incounter++;
						}
					}
				}
			};
			if (signalingDataChannel === null) {
				signalingDataChannel = instance.signalingDataChannel = {
					onmessage: function(e) {
					},
					onopen: function(e) {
					},
					send: function(str) {
						if (str !== '') {
							outbuffer.push(btoa(str));
							if (sendMsgsTimeout === null) sendMsgs();
						}
					}
				};
			}
		}());

		if (!isSignalingInstance()) {

			signalingDataChannel.onmessage = function(e) {
				if (offerer && e.data == 'renegotiationneeded') {
					renegotiate(); // Other end wants a new offer!
				} else if (!offerer && e.data.substr(0, 7) == 'offer: ') {
					peerConnection.setRemoteDescription(new RTCSessionDescription({sdp: e.data.substr(7), type: 'offer'}));
					peerConnection.createAnswer(function(description) {
						peerConnection.setLocalDescription(description);
						signalingDataChannel.send('answer: ' + description.sdp);
					});
				} else if (offerer && e.data.substr(0, 8) == 'answer: ') {
					peerConnection.setRemoteDescription(new RTCSessionDescription({sdp: e.data.substr(8), type: 'answer'}));
				} else if (offerer && e.data.substr(0, 11) == 'candidate: ') {
					peerConnection.addIceCandidate(new RTCIceCandidate({candidate: e.data.substr(11)}));
					
				}
			};

			// Function to renegotiate with a new offer
			var renegotiate = function() {
				//if (peerConnection.signalingState == 'stable') {
					peerConnection.createOffer(function(description) {
						peerConnection.setLocalDescription(description);
						signalingDataChannel.send('offer: ' + description.sdp);
					});
				//}
			};

		}

		if (isSignalingInstance()) {

			// Candidates will be stored in this array, to be sent to remote.
			var myCandidates = [];
			(function() {
				var c = [];
				// Dont populate myCandidate until there is a null candidate.
				peerConnection.onicecandidate = function(e) {
					if (e.candidate != null) {
						c.push(e.candidate);
					} else {
						console.log('Got null candidate.');
						myCandidates = c;
						c = [];
					}
				}
			})();

		} else {
			peerConnection.onicecandidate = function(e) {
				if (e.candidate != null) {
					
					setTimeout(function() {
						signalingDataChannel.send('candidate: ' + e.candidate.candidate);
					}, 1000);
				}
			}
		}

		peerConnection.onconnecting = function(e) {
			console.log('peerConnection.onconnecting');
		};
		peerConnection.onopen = function(e) {
			console.log('peerConnection.onopen');
		};
		peerConnection.onclose = function(e) {
			console.log('peerConnection.onclose');
		};
		peerConnection.onaddstream = function(e) {
			console.log('peerConnection.onaddstream');
		};
		peerConnection.onremovestream = function(e) {
			console.log('peerConnection.onremovestream');
		};
		peerConnection.ondatachannel = function(e) {
			console.log('peerConnection.ondatachannel');
		};

		peerConnection.onnegotiationneeded = function(e) {
			console.log('peerConnection.onnegotiationneeded');
		};

		if (!isSignalingInstance()) {

			if (!offerer) {
				peerConnection.onnegotiationneeded = function(e) {
					console.log('peerConnection.onnegotiationneeded');
					signalingDataChannel.send('renegotiationneeded');
				}
			} else {
				peerConnection.onnegotiationneeded = function(e) {
					console.log('peerConnection.onnegotiationneeded (at offerers end)');
					renegotiate(); 
				}
			}

		}

		(function() {
			console.log('apa');
			var connectCounter = 0;
			peerConnection.ongatheringchange = peerConnection.oniceconnectionstatechange = peerConnection.onsignalingstatechange = function(e) {
				console.log('signalingState: ' + peerConnection.signalingState + ' - iceConnectionState: ' + peerConnection.iceConnectionState + ' - iceGatheringState: ' + peerConnection.iceGatheringState + ' - connectCounter: ' + connectCounter);
				if (connectCounter === 0 && peerConnection.signalingState == 'stable' && peerConnection.iceConnectionState == 'connected' && peerConnection.iceGatheringState == 'complete') {
					settings.connect(peerConnection);

					connectCounter++;
				}

			};
		}());

		// Returns a safe realm string:
		var realm = function() {
			return settings.realm.toLowerCase().replace(/[^a-z0-9]/g, '');
		};

		var findOffer = function(callback) {
			console.log('findOffer();');
			$.ajax({
				data: {
					'realm': realm(),
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
		};

		var sendOffer = function(sdp, callback) {
			offerer = true;
			console.log('sendOffer();');
			$.ajax({
				data: {
					'realm': realm(),
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

		};
		
		var waitForAnswer = function(id, callback) {
			console.log('waitForAnswer();');
			$.ajax({
				data: {
					'realm': realm(),
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
		};
		
		var sendAnswer = function(sdp, id, callback) {
			offerer = false;
			console.log('sendAnswer();');
			$.ajax({
				data: {
					'realm': realm(),
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
		};
		
		var sendCandidates = function(id, who, callback) {
			if (myCandidates.length == 0) {
				setTimeout(function() {
					sendCandidates(id, who, callback);
				}, 200);
			} else {
				console.log('sendCandidates(id=' + id + ');');
				$.ajax({
					data: {
						'realm': realm(),
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
						console.log('Response on sendCandidates:');
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

		if (isSignalingInstance()) {

			console.log('-----------------------a SINGALING INSTANCE-');


			findOffer(function(err, sdp, id) {
				if (err) {
					console.log('Got no offer.');
					peerConnection.createOffer(function(description) {
						peerConnection.setLocalDescription(description);
						console.log('Created offer.');
						sendOffer(description.sdp, function(err, id) {
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

		} else {

			console.log('------------------------');

		}
	};

	sigRTC = function(options) {
		// The settings...
		var settings = $.extend({
			connect: function(peerConnection) { // Callback when successfully connected.
			},
			error: function(err) { // Callback on errors.
			},
			realm: window.location.href
		}, options);

		var signalingInstance = new Instance({
			connect: function (peerConnection) {

				var dataInstance = new Instance({
					connect: settings.connect,
					error: settings.error,
					realm: '',
					signalingDataChannel: signalingInstance.signalingDataChannel
				});

			},
			error: function (err) {
				options.error(err);
			},
			realm: options.realm
		});
	};

}());



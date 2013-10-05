var
	http = require('http'),
	qs = require("querystring");

var
	answers = {},
	offers = {},
	candidates = {},
	alreadyconn = {};

http.createServer(function(req, res) {
	res.writeHead(200, {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'});
	if (req.method === 'POST') {
		var body = '';
		req.on('data', function (chunk) {
			body += chunk;
		});
		req.on('end', function() {
			var
				epochMS = new Date().getTime(),
				epochMin = Math.round(epochMS / 60000),
				postvars = qs.parse(body);

			console.dir(postvars);

			if (!postvars.realm) return res.end(JSON.stringify({err: "Missing realm variable."}));

			if (postvars.act === 'offer') {
				if (!postvars.sdp) return res.end(JSON.stringify({err: "Missing sdp variable."}));

				if (typeof offers[epochMin] === 'undefined') offers[epochMin] = {};
				if (typeof offers[epochMin][postvars.realm] === 'undefined') offers[epochMin][postvars.realm] = {};
				var rnd = Math.floor(Math.random() * 10000);
				offers[epochMin][postvars.realm][epochMS + '.' + rnd] = postvars.sdp;
				if (postvars.alreadyconn) alreadyconn[epochMin + '-' + postvars.realm + '-' + epochMS + '.' + rnd] = postvars.alreadyconn;
				return res.end(JSON.stringify({id: epochMin + '-' + postvars.realm + '-' + epochMS + '.' + rnd}));

			} else if (postvars.act === 'delete') {

				var deleteData = postvars.id.split('-');
				if (deleteData.length === 3) {
					if (typeof offers[deleteData[0]] !== 'undefined' && typeof offers[deleteData[0]][deleteData[1]] !== 'undefined' && typeof offers[deleteData[0]][deleteData[1]][deleteData[2]] !== 'undefined') {
						delete (offers[deleteData[0]][deleteData[1]][deleteData[2]]);
					}
				}

			} else if (postvars.act === 'wait') {
				if (!postvars.id) return res.end(JSON.stringify({err: "Missing id variable."}));
					
				var waiterCounter = 0;
				var waiter = function() {
					if (typeof answers[postvars.id] !== 'undefined') {
						res.end(JSON.stringify({sdp: answers[postvars.id]}));
						delete answers[postvars.id];
						delete alreadyconn[postvars.id];
						return;
					}
					waiterCounter += 1;
					if (waiterCounter < 60) {
						setTimeout(waiter, 1000);
					} else {
						return res.end(JSON.stringify({err: "Got no answer."}));
					}
				};
				waiter();

			} else if (postvars.act === 'find') {
				for (var i = epochMin - 1; i <= epochMin; i++) {
					if (typeof offers[i] !== 'undefined' && typeof offers[i][postvars.realm]) {
						for (var key in offers[i][postvars.realm]) {
							if (offers[i][postvars.realm].hasOwnProperty(key)) {

								var alreadyconnected = false;
								if (alreadyconn[i + '-' + postvars.realm + '-' + key] && postvars.alreadyconn) {
									var ac0 = alreadyconn[i + '-' + postvars.realm + '-' + key].split(',');
									var ac1 = postvars.alreadyconn.split(',');
									for (var ac0c = 0; ac0c < ac0.length; ac0c++) {
										for (var ac1c = 0; ac1c < ac1.length; ac1c++) {
											if (ac0[ac0c] == ac1[ac1c]) alreadyconnected = true;
										}
									}
								}

								if (!alreadyconnected) {
									res.end(JSON.stringify({sdp: offers[i][postvars.realm][key], id: i + '-' + postvars.realm + '-' + key}));
									delete offers[i][postvars.realm][key];
									delete alreadyconn[i + '-' + postvars.realm + '-' + key];
									return;
								}
							}
						}
					}
				}
				res.end('{}');

			} else if (postvars.act == 'answer') {
				if (!postvars.id) return res.end(JSON.stringify({err: "Missing id variable."}));
				if (!postvars.sdp) return res.end(JSON.stringify({err: "Missing sdp variable."}));
				answers[postvars.id] = postvars.sdp;

				var waiterCounter = 0;
				var waiter = function() {
					if (typeof candidates[postvars.id + '-offer'] !== 'undefined') {
						res.end(JSON.stringify({candidates: JSON.parse(candidates[postvars.id + '-offer'])}));
						delete candidates[postvars.id + '-offer'];
						return;
					}
					waiterCounter += 1;
					if (waiterCounter < 60) {
						setTimeout(waiter, 1000);
					} else {
						res.end(JSON.stringify({err: "Got no candidates."}));
					}
				};
				waiter();

			} else if (postvars.act === 'cand') {
				if (!postvars.id) return res.end(JSON.stringify({err: "Missing id variable."}));
				if (!postvars.candidates) return res.end(JSON.stringify({err: "Missing candidates variable."}));
				if (!postvars.who) return res.end(JSON.stringify({err: "Missing who variable."}));
				if (postvars.who !== 'offer' && postvars.who !== 'answer') return res.end(JSON.stringify({err: "Who must be offer or answer."}));
				candidates[postvars.id + '-' + postvars.who] = postvars.candidates;
				if (postvars.who === 'answer') return res.end('{}');
				var waiterCounter = 0;
				var waiter = function() {
					if (typeof candidates[postvars.id + '-answer'] !== 'undefined') {
						res.end(JSON.stringify({candidates: JSON.parse(candidates[postvars.id + '-answer'])}));
						delete candidates[postvars.id + '-answer'];
						return;
					}
					waiterCounter += 1;
					if (waiterCounter < 60) {
						setTimeout(waiter, 1000);
					} else {
						res.end(JSON.stringify({err: "Got no candidates."}));
					}
				};
				waiter();

			} else {
				return res.end(JSON.stringify({err: 'Unknown act.'}));
			}

		});

	} else {
		return res.end(JSON.stringify({err: 'We only do POST requests.'}));
	}

}).listen(process.env.PORT | 8080, '0.0.0.0');

console.log('Server running.');

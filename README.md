## sigRTC - a WebRTC Signalling Protocol

* A generic HTTP protocol for exchanging WebRTC "offers", "answers" and "candidates",
  to start WebRTC P2P connections. We recommend this protocol for only initiating WebRTC connections,
  and to do renegotiation over the DataChannel API when the connection is already established.
* Minimalistic approach on the protocol, trying to keep bandwidth and number of requests down.
* The protocol does not do any authentication/authorization. The intent is to make P2P available for all!
* Anyone who would like to participate to a more open/free Internet should be able to deploy this protocol
  at their web server/page. (That means: We should have lots of implementations in different languages,
  as plugins to popular CMS platforms like Wordpress, etc.)

## The protocol

Each deployment of the protocol should be available over HTTP(S) POST requests at some URL.
In this documentation, the example URL is http://example.org/foo/bar

### The Realm

All requests to sigRTC should have the POST variable `realm=`.
The realm identifies your application/protocol/whatever, so you connect to someone using compatible software.
It is just some random string that you choose yourself. It could be `realm=myapp` or actually anything.
If two clients should be able to connect to each other, they must use the same realm.

You can also use the realm to separate the users at your site. An example: add a chat room name to your realm string,
to make sure users will only connect to other users in the same chat room.

To avoid any implementation troubles with case insensitive file systems or other fuckups,
we are a bit anal and only allow lower case a-z and 0-9 chars in the realm string.

### Send an offer

When you have created a WebRTC "offer", you should post it to a sigRTC server to say
"Hey ppl! I'm here now, please connect to me!" This is how:

    realm=myapp
    act=offer
    sdp=[webrtc offer sdp string]
    alreadyconn=[comma separated list of id:s that the client already is connected with]

This request should return an ID string, identifying this connection attempt:

    { "id": "d131dd02c5e6eec4" }

The id string could be anything, but must not contain comma (,) sign, since comma will be used
for separation. It is up to the server implementation to make sure it is something unique.

alreadyconn is used to make sure the same clients does not get multiple connections to each other.
If two clients have one (or more) common id in their alreadyconn when doing act=offer and act=find,
then they should not be paired together by the server.

### Delete an offer

If you want to remove an unanswered offer:

    realm=myapp
    act=delete
    id=[id of the offer to be deleted]

### Wait for an answer

After you have sent an offer and got an ID, you should wait for an answer.

    realm=MyApp
    act=wait
    id=[the id returned from the act=offer request]
    
This request is a long polling request and it should return:

    { "sdp": "[the webrtc answer sdp string from the other user]" }
    
If the long polling connection times out or we never get an answer, then this request should return nothing
(0 bytes, an empty string, or whatever you call it...)

### Find an offer

Instead of creating a WebRTC "offer" and post it, you could just search for other peoples' offers.

    realm=MyApp
    act=find
    alreadyconn=[comma separated list of id:s that the client already is connected with]

This request should return:

    {
      "sdp": "[the webrtc offer sdp string from the other user]"
      "id": "d131dd02c5e6eec4"
    }

If there is no offer available, then it should return nothing (an empty string, 0 bytes, you know...).

alreadyconn is used to make sure the same clients does not get multiple connections to each other.
If two clients have one (or more) common id in their alreadyconn when doing act=offer and act=find,
then they should not be paired together by the server.

### Send an answer and wait for candidates

If you got an offer, create a WebRTC answer and send it to the sigRTC server.

    realm=MyApp
    act=answer
    id=[the id string that came with the offer]
    sdp=[webrtc answer sdp string]

This is always a long polling request. It should return all ICE candidates from the other client.
If the long polling times out or no candidates are ever sent, this request should not return anything
at all (0 bytes, en empty string, nothing, you get it...)

This request should return:

    {
      "candidates": [
        "some candidate string",
        "some other candidate string"
      ]
    }

### Send candidates

Send candidates to the other user.

    realm=MyApp
    act=cand
    id=[the id string that came with the offer]
    candidates="[ json array with all candidates ]"
    who=offer

The `who` variable could be "offer" or "answer", defining if the caller was the one who made the offer
or the answer.

If this call is made by the one who made an offer, then this call will be long polling,
and returns an JSON array with all candidates from the other client. If the long polling request times
out or if no candidates are sent by the other client, this request returns nothing (0 bytes, an empty string,
or whatever...).

If this2 call is made by the one who made an answer, then this call is not long polling and it will always
return nothing.

### The full connection process:

1. Client tries to find and offer (`act=find`)
2. If there was an offer available, then Goto 9. Otherwise continue at 3.
3. There was no available offer, so we create an offer and send it (`act=offer`) and get an ID back.
4. Now, wait for an answer, doing long polling (`act=wait`).
5. If there was no answer, then wait some moments and Goto 4 (we should be able to use the same ID).
6. We got an answer (at 4 above)
7. Send candidates (`act=cand` & `who=offer`) and wait for candidates from the other end.
8. You got candidates, Goto 13. You did not get candidates, retry 7.
9. There was an available offer, so we create an answer and send it (`act=answer´).
10. Now, wait for candidates from the other end. When they arrive, Goto 12.
11. If candidates never arrive, then retry! Goto 9.
12. Send our own candidates (`act=cand` & `who=answer`).
13. You are finished! WebRTC should be able to connect!

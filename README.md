hangout
=======

Planka Hangout är en gruppchatt – ett mötesrum på Interwebbz ❤ Gratisgenerationen.

Till skillnad från andra chattar på webben så skickas inte era chattmeddelanden till någon server där informationen sparas. Istället så öppnar Planka Hangout en direktanslutning mellan dom som chattar (peer-to-peer!) och ni utväxlar meddelanden direkt mellan varandra på Internet. Det gör att det inte finns någon chathistorik sparad någonstans förutom i webbläsarna hos dom som chattar, och när alla deltagare har lämnat chattrummet så finns inte konversationer kvar någonstans längre.

Planka Hangout bygger på helt sprillans ny teknik som kallas WebRTC, och därför kan inte alla webbläsare använda Planka Hangout. Men nyare versioner av Firefox eller Chrome fungerar garanterat!

Tekniskt mumbojumbo
-------------------

Planka Hangout bygger på:
* WebRTC – själva protokollet i webbläsarna som kan skapa Peer-to-Peer-anslutningar.
* sigRTC – ett protokoll som används för att olika klienter ska kunna hitta varandra. Jämför med en torrenttracker typ. Protokollet finns här: https://github.com/klandestino/sigRTC
* TURN – ibland händer det att brandväggar osv stoppar Peer-to-peer-anslutningar, och då använder vi ett protokoll som kallas TURN för att "studsa" trafiken via en server. Mer info: http://turnservers.com/


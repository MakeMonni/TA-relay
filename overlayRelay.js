const TAWebsocket = require("tournament-assistant-client");
const WebSocket = require('ws');
const config = require("./config.json")
const port = 2223;

const wss = new WebSocket.Server({ "port": port });
wss.on('connection', function connection(ws) {
    ws.on('message', function message(data, isBinary) {
        console.log(`Received message => ${data}`)
        wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(data, { binary: isBinary });
            }
        });
    });
});

const taWebsocket = new TAWebsocket.TAWebsocket({
    url: config.taWebsocket,
    name: "Overlay",
})

const ws = new WebSocket(config.outgoingWebsocket);
sockets = ws;
let matchData = [];
let currentHash = "";
let inMatch

ws.onopen = function (e) {
    sockets.send('Message From Client')
    console.log("Connected to Relay server");
};

taWebsocket.taClient.on('matchCreated', async (e) => {
    if (!inMatch) {
        console.log("Created match");
        e.data.associated_users.push(taWebsocket.taClient.Self)
        taWebsocket.sendEvent(new TAWebsocket.Packets.Event({
            match_updated_event: new TAWebsocket.Packets.Event.MatchUpdatedEvent({ match: e.data })
        }));

        for (let i = 0; i < e.data.associated_users.length; i++) {

            if (e.data.associated_users[i].user_id > 0) {
                matchData.push(e.data.associated_users[i].user_id);
                sockets.send(JSON.stringify({ 'Type': '1', 'userid': e.data.associated_users[i].user_id, 'order': i }));
            }
        }
        inMatch = true;
    }
});

taWebsocket.taClient.on('matchDeleted', async (e) => {
    if (matchData.includes(e.data.associated_users[0].user_id)) {
        inMatch = false;
        console.log("Deleted match");
        matchData = [];
        sockets.send(JSON.stringify({ 'Type': '2' }));
    }
});

taWebsocket.taClient.on('matchUpdated', (e) => {
    try {
        if (currentHash !== e.data.selected_level.level_id) {
            currentHash = e.data.selected_level.level_id
            sockets.send(JSON.stringify({ 'Type': '3', 'LevelId': e.data.selected_level.level_id, 'Diff': e.data.selected_difficulty }));
        }
    } catch (err) {
        console.log(err); 1
    }
});

taWebsocket.taClient.on('userUpdated', async (e) => {
    if (matchData.includes(e.data.user_id)) {
        sockets.send(JSON.stringify({ 'Type': '4', 'playerId': e.data.user_id, 'score': e.data.score, 'combo': e.data.combo, 'acc': e.data.accuracy, 'playerName': e.data.name, 'visible': true }, null, 2));
    }
});
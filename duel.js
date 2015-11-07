/*jslint  node: true, plusplus: true*/

'use strict';
var dll = process.env.DLL || '\\ocgcore.dll',
    db = process.env.DB || '.\\cards.cdb',
    scripts = process.env.SCRIPTS || '.\\scripts\\',
    Duel = require('./ocgwrapper/ocgwrapper.js'),
    duel = new Duel(),
    ygoserver, //port 8911 ygopro Server
    WebSocketServer = require('ws').Server,
    Socket = require('primus').createSocket({
        iknowclusterwillbreakconnections: true
    }),
    client = new Socket('127.0.0.1:24555'); //Internal server communications to gamelist.

function InitServer() {
    // When a user connects, create an instance and allow the to duel, clean up after.
    var parsePackets = require('./parsepackets.js'),
        ws;

    ws = new WebSocketServer({
        port: 8082
    });
    ws.on('connection', function connection(socket) {

        socket.on('message', function incoming(data) {

        });
        socket.on('close', function close() {
            console.log('socket, disconnected');
        });
        socket.on('error', function close(error) {
            console.log(error);
        });
    });

}



function internalUpdate(data) {
    if (data.action === 'internalRestart') {
        if (data.password !== process.env.OPERPASS) {
            return;
        }
        //process.exit(0);
    }
}

function onConnectGamelist() {
    client.write({
        action: 'internalServerLogin',
        password: process.env.OPERPASS,
        gamelist: false,
        registry: false
    });
}


function onCloseGamelist() {

}

client.on('data', internalUpdate);
client.on('open', onConnectGamelist);
client.on('close', onCloseGamelist);
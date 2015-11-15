/*jslint  node: true, plusplus: true*/

'use strict';

var dll = process.env.DLL || __dirname + '\\ocgwrapper\\ocgcore-64.dll',
    db = process.env.DB || '.\\cards.cdb',
    scripts = process.env.SCRIPTS || '.\\scripts\\',
    lflist = process.env.LFLIST || '.\\lflist.conf',
    Duel = require('./ocgwrapper/ocgwrapper.js'),
    ygoserver, //port 8911 ygopro Server
    WebSocketServer = require('ws').Server,
    drawcount = 5;

setTimeout(function () {
    var game = new Duel(dll, db, scripts, lflist),
        pduel = game.pointer;
    console.log(game);

    game.set_player_info(pduel, 0, 8000, 1, drawcount);
    game.set_player_info(pduel, 1, 8000, 1, drawcount);
}, 2000);
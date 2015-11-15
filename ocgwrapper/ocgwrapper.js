/*jslint node:true, plusplus : true, bitwise : true */

'use strict';

var sqlite3 = require('sqlite3').verbose(), // access databse file */
    fs = require('fs'), // access file system */
    ffi = require('ffi'), // allows dynamic linking of the ocgapi.dll, critical; */
    ref = require('ref'), // allows use of C++ pointers for C++ JS interactions, critical */
    struct = require('ref-struct'), // allows use of C++ structures for C++ JS interactions, critical 
    arrayType = require('ref-array'), // allows generation of arraybuffers to use as pointers (engineBuffer[x])
    char_array = arrayType(ref.types.char),
    byte_array = arrayType(ref.types.byte);
//queryfor = require('./sql-queries'); * /

function constructDatabase(targetDB, targetFolder) {
    // create instance of card database in memory 2MB, prevents sychronous read request and server lag.
    var database,
        cards = {};

    function handleQueryRow(error, row) {
        if (error) {
            //throw error;
            console.log(error); //fuck it keep moving.
        }
        cards[row.id] = row;
    }
    console.log(targetDB, targetFolder);

    database = new sqlite3.Database(targetDB, sqlite3.OPEN_READ);
    database.on("open", function () {
        console.log("database was opened successfully");
    });
    database.on("close", function () {
        console.log("database was closed successfully");
    });
    //    database.each(queryfor.statistics, {}, handleQueryRow, function () {});
    //    database.end();

    return function (request) {
        //function used by the core to process DB
        var code = request.code;

        return struct({
            code: code,
            alias: cards[code].alias || 0,
            setcode: cards[code].setcode || 0,
            type: cards[code].type || 0,
            level: cards[code].level || 1,
            attribute: cards[code].attribute || 0,
            race: cards[code].race || 0,
            attack: cards[code].attack || 0,
            defence: cards[code].defense || 0
        });
    };
}

function constructScripts(targetFolder) {
    //create instance of all scripts in memory 14MB, prevents sychronous read request and server lag.
    var filelist = [],
        scripts = {};

    function readFile(filename) {
        // loop through a list of filename asynchronously and put the data into memory.
        fs.readfile(targetFolder + '/' + filename, function (error, data) {
            scripts[filename] = data;
            filelist.shift();
            if (filelist.length > 0) {
                readFile(filelist[0]);
            } else {
                return;
            }
        });
    }

    fs.readdir(targetFolder, function (error, list) {
        // get list of script filenames in the folder.
        if (error) {
            throw console.log(error);
        }
        filelist = list;
    });

    return function (id) {
        //function used by the core to process scripts
        var filename = 'c' + id,
            output = new Buffer(scripts[filename]);
        return id;
    };
}


//This needs to be replaced with Irates, which I am pretty sure is better in every other way.
function banlist(lflist) {
    var banlistcount = 0,
        output = [],
        i,
        toArray,
        topush;
    for (i = 0; lflist.length > 0; i++) {
        if (lflist[i] !== undefined) {
            if (lflist[i] !== '') {
                if (lflist[i][0] !== '#') {
                    if (lflist[i][0] === '!') {
                        banlistcount++;
                        if (!output[banlistcount]) {
                            output[banlistcount] = [];
                        }
                    } else {
                        if (lflist[i].indexOf(' ') > -1) {
                            toArray = lflist[i].split(' ');
                            topush = {
                                cardId: toArray[0],
                                quantity: toArray[1]
                            };

                            output[banlistcount].push(topush);
                        }
                    }
                }
            }
        }
    }
    return output;
}

function wrapDuel(duel) {
    duel.duelEndProc = function () {
        //defined by whatever is using this
        //think of this as a virtual function.
    };
    duel.analyze = function () {
        //defined by whatever is using this
        //think of this as a virtual function.
    };
    duel.InitPlayers = function (startLp, startHand, drawCount) {
        duel.set_player_info(duel.pointer, 0, startLp, startHand, drawCount);
        duel.set_player_info(duel.pointer, 1, startLp, startHand, drawCount);
    };
    duel.AddCard = function (cardId, owner, location) {
        duel.new_card(duel.pointer, cardId, owner, owner, location, 0, 0);
    };
    duel.AddTagCard = function (cardId, owner, location) {
        duel.new_tag_card(duel.pointer, cardId, owner, location);
    };
    duel.Start = function (options) {
        duel.start_duel(duel.pointer, options);
    };
    duel.Proces = function () {
        //char engineBuffer[0x1000]; // pointer, referenced in other calls.
        duel.engineBuffer = char_array(0x1000);
        var engFlag = 0,
            engLen = 0,
            stop = 0,
            result;
        while (!stop) {
            if (engFlag === 2) {
                break;
            }
            result = process(duel.pointer);
            engLen = result & 0xffff;
            engFlag = result >> 16;
            if (engLen > 0) {
                duel.get_message(duel.pointer, duel.engineBuffer);
                stop = duel.analyze(duel.engineBuffer, engLen);
            }
        }
        if (stop === 2) {
            duel.duelEndProc();
        }

    };
    duel.SetResponse = function (resp) { //takes a number or an array.
        //this is two functions in iceygo's code so we are going to do a parameter check
        // split it into the two calls.
        if (typeof resp === 'number') {
            duel.set_responsei(duel.pointer, resp);
            return;
        }
        //marshall the array [1,0,3,2,1,0 ...] into a buffer with proper typing

        if (resp.Length > 64) {
            return;
        }
        var buf = new Buffer(resp);
        duel.set_responseb(duel.pointer, buf);
    };
    duel.QueryFieldCount = function (player, location) {
        return duel.query_field_count(duel.pointer, player, location);
    };
    duel.QueryFieldCard = function (player, location, flag, useCache) {
        useCache = (useCache) ? 1 : 0;
        //use the buffer from duel.Process();
        var len = duel.query_field_card(duel.pointer, player, location, flag, duel.engineBuffer, useCache);
        return new Buffer(duel.engineBuffer, 0, len);
    };
    duel.QueryCard = function (player, location, sequence, flag) {
        var len = duel.query_card(duel.pointer, player, location, sequence, flag, duel.engineBuffer, 0);
        return new Buffer(duel.engineBuffer, 0, len);
    };
    duel.QueryFieldInfo = function () {
        duel.query_field_info(duel.pointer, duel.engineBuffer);
        return new Buffer(duel.engineBuffer, 0, 256);

    };
    duel.End = function () {
        duel.end_duel(duel.pointer);
        duel.pointer = undefined;
        delete duel.pointer;
    };

    return duel;
}

function initDuel(dllLocation, settings) {
    var duelptr,
        seed = Math.floor((Math.random() * 4294967295)), // random uint32
        cardReader = ffi.Function('uint32', ['uint32', 'pointer'], settings.card_reader), //pointer function for card reader
        scriptReader = ffi.Function('uint32', ['uint32', 'pointer'], settings.script_reader), // pointer function for script reader
        messageHandler = ffi.Function('uint32', ['pointer', 'uint32'], console.log), // pointer function for message handler
        ocgapi = ffi.Library(dllLocation, {
            'set_script_reader': ['void', [cardReader]],
            'set_card_reader': ['void', [scriptReader]],
            'set_message_handler': ['void', ['pointer']],
            'create_duel': ['pointer', ['uint32']],
            'start_duel': ['void', ['pointer', 'int']],
            'end_duel': ['void', ['pointer']],
            'set_player_info': ['void', ['pointer', 'int32', 'int32', 'int32', 'int32']],
            'get_log_message': ['void', ['pointer', 'byte*']],
            'get_message': ['int32', ['pointer', 'pointer']],
            'process': ['int32', ['pointer']],
            'new_card': ['void', ['pointer', 'uint32', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8']],
            'new_tag_card': ['void', ['pointer', 'uint32', 'uint8', 'uint8']],
            'query_card': ['int32', ['pointer', 'uint8', 'uint8', 'int32', 'byte*', 'int32']],
            'query_field_count': ['int32', ['pointer', 'uint8', 'uint8']],
            'query_field_card': ['int32', ['pointer', 'uint8', 'uint8', 'int32', 'byte*', 'int32']],
            'query_field_info': ['int32', ['pointer', 'byte*']],
            'set_responsei': ['void', ['pointer', 'int32']],
            'set_responseb': ['void', ['pointer', 'byte*']],
            'preload_script': ['int32', ['pointer', 'char*', 'int32']]
        }); // connect to the dll and expose the functions in it.

    ocgapi.set_card_reader(new Buffer([0])); // connect the pointer functions
    ocgapi.set_script_reader(new Buffer([0]));
    ocgapi.set_message_handler(new Buffer([0]));
    ocgapi.pointer = ocgapi.create_duel(seed); //generate a duel.
    return wrapDuel(ocgapi);
}


function ocgwrapper(dllLocation, cardDBLocation, scriptFolder, lflist) {
    var settings = {
        card_reader: constructDatabase(cardDBLocation), //needs to be configurable
        script_reader: constructScripts(scriptFolder), //needs to be configurable
        lflist: fs.readFileSync(lflist).toString().split("\r\n")
    };
    return initDuel(dllLocation, settings);
}

module.exports = ocgwrapper;
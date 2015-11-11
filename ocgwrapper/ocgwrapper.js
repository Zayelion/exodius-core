/*jslint node:true, plusplus : true */

'use strict';

var sqlite3 = require('sqlite3').verbose(), // access databse file */
    fs = require('fs'), // access file system */
    ffi = require('ffi'), // allows dynamic linking of the ocgapi.dll, critical; */
    ref = require('ref'), // allows use of C++ pointers for C++ JS interactions, critical */
    struct = require('ref-struct'); // allows use of C++ structures for C++ JS interactions, critical 
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

function HandleMessage(reader, raw, len) {
    while (reader.BaseStream.Position < len) {
        var msg = reader.ReadByte(),
            result = -1;
        if (_analyzer != null)
            result = _analyzer.Invoke(msg, reader, raw);
        if (result != 0)
            return result;
    }
    return 0;
}


function wrapDuel(duel) {
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
        var fail = 0,
            result,
            len,
            arr;
        while (true) {
            result = duel.process(duel.pointer);
            len = result & 0xFFFF;

            if (len > 0) {
                fail = 0;
                arr = new Buffer(4096);
                duel.get_message(duel.pointer, _buffer);
                Marshal.Copy(_buffer, arr, 0, 4096);
                result = HandleMessage(new BinaryReader(new Buffer(arr)), arr, len);
                if (result !== 0)
                    return result;
            } else if (++fail == 10)
                return -1;
        }
    };
    duel.SetResponse = function () {}; //this is two functions in iceygo's code.
    duel.QueryFieldCount = function () {};
    duel.QueryFieldCard = function () {};
    duel.QueryCard = function () {};
    duel.QueryFieldInfo = function () {};
    duel.End = function () {};

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
    duelptr = ocgapi.create_duel(seed); //generate a duel.
    return wrapDuel({
        pointer: duelptr,
        duel: ocgapi,
        banlist: banlist(settings.lflist)
    });
}


function ocgwrapper(dllLocation, cardDBLocation, scriptFolder, lflist) {
    var settings = {
        card_reader: constructDatabase(cardDBLocation), //needs to be configurable
        script_reader: constructScripts(scriptFolder), //needs to be configurable
        lflist: fs.readFileSync(lflist).toString().split("\r\n")
    };
    fs.exists(dllLocation, function (dllDetected) {
        if (dllDetected) {
            return initDuel;
        } else {
            var errorMessage = '[OCGWrapper]:Error could not find OCGCore at: ' + dllLocation;
            throw new Error(errorMessage);
        }
    });
}

module.exports = ocgwrapper;
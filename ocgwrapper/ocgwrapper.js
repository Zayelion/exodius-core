/*jslint node:true */

'use strict';

var sqlite3 = require('sqlite3').verbose(),
    /* access databse file */
    fs = require('fs'),
    /* access file system */
    ffi = require('ffi'),
    /* allows dynamic linking of the ocgapi.dll, critical; */
    ref = require('ref'),
    /* allows use of C++ pointers for C++ JS interactions, critical */
    struct = require('ref-struct');
/* allows use of C++ structures for C++ JS interactions, critical 
queryfor = require('./sql-queries');*/


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
        return output;
    };
}

var settings = {
    card_reader: constructDatabase('./card.cdb'), //needs to be configurable
    script_reader: constructScripts('./scripts/') //needs to be configurable
};
console.log((__dirname + '\\ocgwrapper\\ocgcore-64.dll'));
fs.exists((__dirname + '\\ocgcore-64.dll'), function (el, no) {
    console.log(el, no);
});

var connect = function (settings) {
    // create new instance of flourohydride/ygopro/ocgcore

    var ocgapi = ffi.Library((__dirname + '\\ocgcore-64.dll'), {
        'set_script_reader': ['void', ['uint32']],
        'set_card_reader': ['void', ['uint32']],
        'set_message_handler': ['void', ['uint32']],
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
    });
    ocgapi.set_script_reader(settings.script_reader());
    return ocgapi;
};

module.exports.core = connect;

connect(settings);
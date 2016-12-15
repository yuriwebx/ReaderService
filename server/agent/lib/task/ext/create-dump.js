"use strict";
const fs = require('fs');
const path = require('path');

const logger = require('../../util/log').getLogger(__filename);

const nano = require('../../conf/db_init');
const config = require('../../../config').task_generator.dump;  //jshint ignore:line
const dumpTimeout = config.timeout_min; //jshint ignore:line
const dumpPath = path.resolve(__dirname, '../../../../../', config.path); // allow to specify relative path

const publicDb = nano.use(require('../../conf/db_names').public());
const fileName = 'public';

let dumpRequested = false;

function dump() {
    logger.log('Start');
    publicDb.list({include_docs: true}, (err, data)=>{ //jshint ignore:line
        if (err) {
            throw err;
        }

        publicDb.info((err, info)=>{
            if (err) {
                throw err;
            }

            const docs = data.rows.map((doc)=>{return doc.doc;});
            const dumpDataStr = JSON.stringify({docs: docs, seq: info.update_seq}); //jshint ignore:line

            fs.exists(dumpPath, function (exists) {
                if (!exists) {
                    fs.mkdir(dumpPath, (err)=> {
                        if (err) {
                            throw err;
                        }
                        writeFile(dumpDataStr);
                    });
                }
                writeFile(dumpDataStr);
            });
        });
    });
}

function writeFile(data) {
    var writeStreamFile = fs.createWriteStream(dumpPath + path.sep + fileName,{flags:'w'});

    writeStreamFile.end(data);

    writeStreamFile.on('close', onEnd);

    function onEnd(){
        logger.log('Finished ', dumpPath + path.sep + fileName);
        dumpRequested = false;
    }
}

dump();

function run() {
    if (!dumpRequested) {
        logger.log('Public docs were updated. Creating dump in %d min...', dumpTimeout);
        dumpRequested = true;
        try {
            setTimeout(dump, dumpTimeout * 60 * 1000);
        }
        catch (e) {
            logger.error(e);
            dumpRequested = false;
        }
    }
}

module.exports = {run: run};
/**
 * Created by aliaksandr.krasitski on 6/14/2016.
 */
"use strict";
const EventEmitter = require('events');
const util = require('util');

const rp = require('request-promise');

const Handler = require('./handler');
const names = require('../../conf/db_names');
const nano = require('../../conf/db_init');
const cfg = require('../../../config.js').task_generator; //jshint ignore:line

const logger = require('../../util/log').getLogger(__filename);

let dbs = new Set(); // store dblist
let skipDbs = new Set();

const lastSeqId = '_local/last_seq';


/**
 * Follow changes for all *_rw databases. Emit event 'create' when got new changes. Then wrapper.js will create a task in task_int database
 * TODO: filter by doc type here (now it's in processor.js)
 *
 * @returns {Feed}
 * @constructor
 *
 * @emit ('create', docs, dbName) - when got new changes
 * @emit db_added
 * @emit db_removed
 *
 */
function Feed() {
    const self = this;
    EventEmitter.call(self);
    const config = nano.config;

    const handler = new Handler(nano);

    self.stop = ()=>{
        clearTimeout(self.start);
    };

    self.start = ()=>{
        setTimeout(self.start, cfg.heartbeat);
        updateDbList().then(checkChanges);
        return Promise.resolve();
    };

    /**
     * dirty update database list
     */
    function updateDbList(){
        return nano.db.list()
            .then(dbArr=>dbArr.filter(x=>!names.isSystem(x)))      // filter by prefix
            //.then(db_arr=>db_arr.filter(x => !dbs.has(x)))  // remove already existed
            .then(dbArr=>{
                let dbSet = new Set(Array.from(dbs).concat(dbArr));

                //log('----');
                for (let db of dbSet) {
                    if(!dbs.has(db)){
                        dbs.add(db);
                        self.emit('db_added', db);
                    }
                    else if(dbArr.indexOf(db) < 0) {
                        dbs.delete(db);
                        self.emit('db_removed', db);
                    }// else - nothing was changed with that db
                }
                return dbArr;
            });
    }

    function getLastSeq(dbName){
        return nano.use(dbName).get(lastSeqId)
            .then((res)=>res.value)
            .catch((e)=>{
                if (e.statusCode === 404) {
                    return 0;
                }
                throw new Error(e);
            });
    }

    function updateLastSeq (dbName, value){
        return nano.use(dbName).get(lastSeqId)
            .catch(()=>{
                return {
                    _id: lastSeqId //jshint ignore:line
                };
            })
            .then((res)=>{
                if (res.value !== value) {
                    res.value = value;
                    return nano.use(dbName).insert(res);
                }
                return Promise.resolve();
            });
    }

    function checkChanges() {
        let allChanges = [];
        Promise.all(Array.from(dbs).filter((dbName)=>{
            return dbName.endsWith('_rw');
        }).map((dbName)=>{
            //skip check db once
            if (skipDbs.has(dbName)) {
                skipDbs.delete(dbName);
                return Promise.resolve();
            }
            return getLastSeq(dbName)
                .then((seq)=>{
                    return rp({
                        uri: config.url + '/' + dbName + '/_changes?include_docs=true&since=' + seq,
                        headers: config.defaultHeaders,
                        transform: JSON.parse
                    });
                })
                .then((res)=>{
                    const results = res.results;

                    if (results.length > 0) {
                        skipDbs.delete(dbName);
                        logger.log('[int] : got %s changes in', results.length, names.noCred(dbName) );
                        var docs = results.map((r)=>{return r.doc;});

                        allChanges.push({docs: docs, dbName: dbName, lastSeq: res.last_seq});  //jshint ignore:line
                    }
                    else {
                        skipDbs.add(dbName);
                    }
                    return handler.getTasks(dbName)
                        .then(tasks=>{
                            if(tasks.length) {
                                logger.log(': got %s tasks in', tasks && tasks.length || 0, names.noCred(dbName) );
                                allChanges.push({docs: tasks, dbName: dbName});
                            }
                            return Promise.resolve();
                        });
                })
                .catch((e)=>{
                    logger.error('checkChanges failed for [%s]:', dbName, e.message);
                });

        }))
        .then(()=>{
            if(allChanges.length) {
                self.emit('create', allChanges);

                allChanges.forEach(res=>{
                    if(res.lastSeq) {
                        updateLastSeq(res.dbName, res.lastSeq);
                    }
                    else {
                        handler.deleteTasks(res.dbName, res.docs);
                    }
                });
            }
        });
    }

    return self;
}
util.inherits(Feed, EventEmitter);

module.exports = Feed;

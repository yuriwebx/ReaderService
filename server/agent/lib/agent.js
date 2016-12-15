/* global Promise: true  */
/*jshint -W030 */
/*jshint -W106 */ // camel case

"use strict";
const _ = require('underscore');
const config = require('../config.js');
const names = require('./conf/db_names');
const schema = require('./conf/db_schema');
const nano = require('./conf/db_init');
const localNano = nano.reinit(config.db.local_url);

const Wrapper = require('./task/wrapper');

const logger = require('./util/log').getLogger(__filename);

const update = require('../db/update.json');
const taskDbName = names.get(config.task_generator.db.prefix.external + config.task_generator.db.name);

logger.log('Agent: int target: %s / %s*', names.noCred(config.db.url), names.prefix);
logger.log('Agent: int local target: %s / %s*', names.noCred(config.db.local_url), names.prefix);
logger.log('Agent: ext target: %s ', config.task_generator.source_db_urls.map(names.noCred).join(', '));


function Agent() {
    let that = this;

    /**
     * start monitoring database changes
     */
    that.start = ()=> {
        logger.log('Agent starting...');
        return verifyDatabases()
            .then(updateSchema)
            .then(applyDbUpdate)
            .then(initDbMonitoring)
            .then(()=>{
                logger.log('Agent Started');
            });

    };

    /**
     * stop monitoring database changes
     */
    that.stop = ()=> {
        // incomplete
        logger.log('Agent stopped');
    };

    /**
     * upload data to system DB (agent) with required DB changes
     */
    function applyDbUpdate() {
        const docId = 'external';
        const agentDb = localNano.use(names.agent());
        return agentDb.get(docId)
            .catch(e=>{
                if (e.statusCode === 404) {
                    return {
                        _id: docId,
                        reset_types: []
                    };
                }
                else {
                    logger.error('cannot access agent.%s doc', docId, e.message);
                }
            })
            .then(doc=>{
                if (doc && doc.reset_types.join('') !== update.external.reset_types.join('')) {
                    logger.log('update agent "%s" migration doc', docId);

                    doc.reset_types = update.external.reset_types;

                    return Promise.all(doc.reset_types.map(type=>{
                            const taskDb = localNano.use(taskDbName);
                            return taskDb.get(type)
                                .catch(logger.error)
                                .then(counter=>{
                                    if (counter) {
                                        counter.value = 0;
                                        return taskDb.insert(counter);
                                    }
                                    return Promise.resolve();
                                });
                        }))
                        .then(()=>{
                            return agentDb.insert(doc);
                        });
                }

                return Promise.resolve();

            })
            .then(()=>{

            });
    }

    /**
     *
     */
    function initDbMonitoring() {
        return new Promise((pass/*, fail*/)=> {
            let cfg = {
                int:{
                    path: 'int',
                    prefix: config.task_generator.db.prefix.internal
                },
                ext: {
                    path: 'ext',
                    prefix: config.task_generator.db.prefix.external
                }
            };

            /*let internalAgentWorker = */new Wrapper(cfg.int.path, cfg.int.prefix);    // jshint ignore:line
            /*let externalAgentWorker = */new Wrapper(cfg.ext.path, cfg.ext.prefix);    // jshint ignore:line

            pass();
        });
    }


    /**
     *
     */
    function verifyDatabases() {
        logger.log('Checking databases');
        return Promise.all([
            // check global databases
            createDB(nano, names.public(), schema.view.public, true),

            createDB(localNano, names.private(), schema.view.private),
            createDB(localNano, names.agent(), schema.view.private),
            createDB(nano, names.quiz(), schema.view.private),
            createDB(nano, names.query(), schema.view.query, true)
        ]);

    }

    /**
     *
     */
    function createDB(nano, dbName, view, isPublic) {
        return nano.db.get(dbName)
            .then(()=> {
                logger.log('  found: %s', dbName);
            })
            .catch(e=>{
                if(e.statusCode !== 404){
                    throw e;
                }

                logger.log('  not found: %s', dbName);

                // will create db
                return nano.db.create(dbName)
                    .then(()=>Promise.all([
                        nano.use(dbName).insert(view),
                        isPublic ? nano.user.free_access(dbName) : nano.user.restrict_access(dbName)
                    ]))
                    .then(()=> {
                        logger.log('  created %s', dbName);
                    })
                    .catch((e)=>{
                        logger.error('failed creating database %s', dbName);
                        logger.error(e);
                    });
            });
    }


    // SCHEMA

    function updateSchema(){
        logger.log('Checking db schema');
        return dbList().then(dbs=>Promise.all(dbs.map(_updateSchema)));
    }

    function dbList(){
        return nano.db.list()
            .then(dbArr=>dbArr.filter(x=>!names.isSystem(x)));     // filter our scope
    }


    function _updateSchema(realDbName){

        let dbName = names.parseDbName(realDbName);
        let targetSchema = schema.view[dbName] || null;

        if(!dbName || !targetSchema){
            // no schema required
            return Promise.resolve();
        }

        // logger.log('Validate schema for %s as %s',  realDbName, dbName, targetSchema._id);

        return nano.use(realDbName)
            .get(targetSchema._id)
            .catch(defaultValue({}))
            .then(doc=>{
                targetSchema._rev = doc._rev;

                // compare schemas
                if( _.isEqual(targetSchema, doc) ){
                    logger.log('  valid for %s as %s', realDbName, dbName);
                    return doc;
                }

                return nano.use(realDbName).insert(targetSchema)
                    .then(any=>{
                        logger.log('  updated %s as %s', realDbName, dbName);
                        return any;
                    });
            });
            // .then(any=>{
            //     logger.log('  schema verified %s as %s', realDbName, dbName);
            //     return any;
            // })
    }


    // TODO: part of nano tools
    function defaultValue(value){
        if(typeof value === 'undefined'){
            value = null;
        }
        return function(e) {
            if (e.statusCode === 404) {
                return value;
            }
            else {
                throw e;
            }
        };
    }


}//////////////////////

// util.inherits(Agent, EventEmitter);

module.exports = Agent;

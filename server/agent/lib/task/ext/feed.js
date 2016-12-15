/**
 * Created by aliaksandr.krasitski on 6/16/2016.
 */
"use strict";
const EventEmitter = require('events');
const util = require('util');
const names = require('../../conf/db_names');

const SourceDb = require('./source-db');
const sourceDb = new SourceDb();
const DumpGenerator = require('./create-dump');

const config = require('../../../config.js');
const generatorConfig = config.task_generator; //jshint ignore:line

const logger = require('../../util/log').getLogger(__filename);


function Feed(taskDb) {
    const self = this;
    EventEmitter.call(self);

    var taskTypes = [];
    Object.keys(config.task_types) //jshint ignore:line
        .map((k)=>{
            taskTypes = taskTypes.concat(config.task_types[k]); //jshint ignore:line
        });

    self.start = ()=>{
        return Promise.all(generatorConfig.source_db_urls.map((dbName)=>{ //jshint ignore:line
            return sourceDb.createFilter(dbName)
                .then(checkChanges.bind(self, dbName));
        }));
    };

    function getLastSeq (type){
        return taskDb.get(type)
            .then((res)=>res.value)
            .catch((e)=>{
                if (e.statusCode === 404) {
                    return 0;
                }
                throw new Error(e);
            });
    }

    function updateLastSeq (type, number){
        return taskDb.get(type)
            .catch(()=>{
                return {
                    _id: type, //jshint ignore:line
                    type: 'counter'
                };
            })
            .then((res)=>{
                if (res.value !== number) {
                    res.value = number;
                    return taskDb.insert(res);
                }
                return Promise.resolve();
            });
    }


    function checkChanges(dbName) {
        setTimeout(checkChanges.bind(self, dbName), generatorConfig.heartbeat);
        return Promise.all(taskTypes.map((type)=>{
            return getLastSeq(type)
                .then(seq=>{
                    return sourceDb.getChanges(dbName, seq, type);
                })
                .then(res=>{
                    return {
                        type: type,
                        data: res
                    };
                });
        }))
        .catch(logger.warn)
        .then(getAllChanges(dbName));
    }

    function getAllChanges(dbName) {
        return function(resArr) {
            var allChanges = [];

            resArr.forEach((obj)=>{
                var results = obj.data.results;
                if (results.length > 0) {
                    logger.log('[ext] : got %s %s changes in', results.length, obj.type, names.noCred(dbName));

                    allChanges = allChanges.concat(results);

                    if(generatorConfig.dump.types.indexOf(obj.type) > -1) {
                        DumpGenerator.run();
                    }

                    updateLastSeq(obj.type, obj.data.last_seq); //jshint ignore:line
                }
            });

            if(allChanges.length) {
                self.emit('create', [{docs: allChanges}]);
            }

            return Promise.resolve();
        };
    }

}
util.inherits(Feed, EventEmitter);

module.exports = Feed;

/**
 * Created by aliaksandr.krasitski on 6/15/2016.
 */
"use strict";
const config = require('../../config.js');
const generatorConfig = config.task_generator; //jshint ignore:line
const limit = generatorConfig.limit;
const taskDbPath = config.db.local_url; //jshint ignore:line

const logger = require('../util/log').getLogger(__filename);

var nano = require('../conf/db_init');

const docUpdateConflictMessage = 'Document update conflict.';

/**
 * @param {string} name
 * @constructor
 */
function TaskStorage(name) {
    const self = this;
    if (taskDbPath) {
        nano = nano.reinit(taskDbPath);
    }
    const db = nano.use(name);

    self.db = db;

    /**
     * @returns {Promise.<any>}
     */
    self.init = ()=>{
        return nano.db.get(name)
            .catch(()=>{
                return nano.db.create(name)
                    .then(()=>{
                        return nano.user.restrict_access(name); //jshint ignore:line
                    })
                    .catch((err)=>{
                        logger.error('Cannot create task DB [%s]:', name, err.message);
                        return Promise.reject(err);
                    });
            });
    };


    /**
     * @param task
     * @returns {Promise.<any>}
     */
    self.insert = (task)=>{
        return self.get(task)
            .catch(()=>{})
            .then((res)=>{
                task._rev = res && res._rev;
                return db.insert(task);
            })
            .catch((e)=>{
                logError(task)(e);
                return Promise.resolve();
            });
    };

    self.get = (task)=>{
        return db.get(task._id);
    };

    self.delete = (task)=>{
        return self.get(task)
            .then((res)=>{
                return db.destroy(res._id, res._rev); //jshint ignore:line
            });
    };

    // get task batch
    self.getAll = ()=>{
        return db.list({limit: limit, include_docs: true})  //jshint ignore:line
            .then(res=>(res.rows || []).map(r=>r.doc));
    };


    self.updateBatch = (data)=>db.bulk(data);


    /**
     * @param {Task} task
     * @returns {Function(Error)} error logger
     */
    function logError(task) {
        return function(e) {
            // TODO replace indexOf to code 409 comparsion
            if (e && e.message && e.message.indexOf(docUpdateConflictMessage) === -1) {
                logger.error("error: ", e.message, task._id); //jshint ignore:line
            }
        };
    }
}
module.exports = TaskStorage;
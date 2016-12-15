/**
 * Created by aliaksandr.krasitski on 6/14/2016.
 */
"use strict";
const logger = require('../../util/log').getLogger(__filename);


const taskPrefix = 'task';
const endSymbol = '\uffff';


/**
 * Follow changes for all *_rw databases. Get ONLY TASKS in this databases (actually pass it to appropriate worker)
 * Task document must have id starts from 'task'
 *
 * @param {Nano} nano
 * @returns {TaskHandler}
 * @constructor
 */
function TaskHandler(nano) {
    const self = this;

    self.getTasks = (dbName)=>{
        return nano.use(dbName).list({startkey: taskPrefix, endkey: taskPrefix + endSymbol, include_docs: true}) //jshint ignore:line
            .catch(logger.error)
            .then(res=>{
                if (res) {
                    return res.rows.map((r)=>{ return r.doc;});
                }
                return Promise.resolve();
            });
    };

    self.deleteTasks = (dbName, docs)=>{
        const tasks = docs.map(d=>{
            return {
                _id: d._id,
                _rev: d._rev,
                _deleted: true
            };
        });
        return nano.use(dbName).bulk({docs: tasks})
            .catch(logger.error);
    };

    return self;
}

module.exports = TaskHandler;

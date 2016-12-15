/**
 * Created by aliaksandr.krasitski on 6/16/2016.
 */
"use strict";
const names = require('../../conf/db_names');
const idGenerator = require('../../util/id-generator');
const getWorker = require('../../worker/all').int;
const config = require('../../../config.js').task_generator; //jshint ignore:line
const TASK_TYPE = config.type.int;

const failCountLimit = config.failCountLimit || 20;

const logger = require('../../util/log').getLogger(__filename);

/**
 *
 */
function Processor() {
    const self = this;

    self.filterTasks = (tasks)=>{
        return tasks
            .filter(task=> {
                var tooMuchErrors = task.failCount >= failCountLimit;
                if (tooMuchErrors) {
                    logger.log('[ext] : too much fails for task: %s', task && task._id);
                }
                return !tooMuchErrors;
            });
    };

    /**
     * Generate task object
     * @param  {object} doc  data object
     * @param  {string} dbName
     * @return {object}        [description]
     */
    self.generate = (doc, dbName)=>{

        if (!doc.type && !doc._deleted) {
            logger.log('[int] : skip task without doc type:', doc._id);
            return null;
        }

        if(doc._deleted){
            // get type from id
            doc.type = idGenerator.getType(doc._id);
        }

        let action = doc._deleted ? 'delete' : 'change';

        const task = {
            _id: dbName + '_' + doc._id,
            type: TASK_TYPE,
            name: doc.type + '-' + action,

            // extra options
            data: doc,
            user: names.getUserId(dbName),
            db: dbName,
            doc_id : doc._id,   // jshint ignore:line
            doc_rev : doc._rev, // jshint ignore:line
            created: doc.created || Date.now()
        };

        //tasks from user RW
        if(doc.type === 'task') {
            task.name = doc.name;
            task.data = doc.data;
            task.created = doc.created;
        }

        return task;
    };

    /**
     * Execute task
     * @param  {InternalTask} task
     * @return {Promise}      [description]
     */
    self.run = (task)=>{
       return handleTask(task);
    };


    function handleTask(taskDoc) {
        const params = getParams(taskDoc);
        const action = params.action;
        const worker = params.worker;

        if(!worker){
            return Promise.resolve({status: 400, message: 'not implemented'});
        }

        return _workerExecute(worker, action, taskDoc);

    }

    function getParams(doc){
        const params = self.parseDoc(doc);
        const name = params.name;
        const action = params.action;
        const worker = getWorker(name);

        if (worker) {
            logger.log('[int] : run:', name, action, doc._id);
        }
        else {
            logger.log('[int] : there is no worker for:', name, action, doc._id);
        }

        return {
            worker: worker,
            name: name,
            action: action
        };
    }

    self.parseDoc = (doc)=>{
        let taskName = doc.name || '';
        const sep = taskName.split('-');
        return {
            name: (sep[0] || doc.type).toLowerCase(),
            action: sep[1] || 'change'
        };
    };

    /**
     * Generic execute method
     */
    function _workerExecute(worker, action, task){
        // logger.log('StudyCourse : ', action/*,  data*/);
        if (!worker[action]) {
            if(action === "delete") {
                // can skip delete action silently
                return Promise.resolve();
            }
            let err = 'Action not found: ' + worker.constructor.name + '.' + action + ' for ' + task.data._id;
            logger.error(err);
            return Promise.resolve({status: 404, message: err});
        }
        return worker[action](task.data, task);
    }
}

module.exports = Processor;

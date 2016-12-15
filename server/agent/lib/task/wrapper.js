/**
 * Created by aliaksandr.krasitski on 6/16/2016.
 */
"use strict";

const generatorConfig = require('../../config.js').task_generator; //jshint ignore:line
const TaskStorage = require('./db');

const names = require('../conf/db_names');

const logger = require('../util/log').getLogger(__filename);

const defaultTimeout = generatorConfig.process_timeout; //jshint ignore:line


/**
 * @param {string} path
 * @param {string} taskDbPrefix
 * @constructor
 */
function Wrapper(path, taskDbPrefix) {
    const self = this;
    const taskDbName = names.get(taskDbPrefix + generatorConfig.db.name); //jshint ignore:line

    const taskDb = new TaskStorage(taskDbName);

    const Processor = require('./' + path + '/processor');
    const Feed = require('./' + path +  '/feed');
    const processor = new Processor();
    const feed = new Feed(taskDb.db);

    self.handle = handle;

    //init task db, after fetch updates
    taskDb.init().then(feed.start)
        .then(()=>{
            //process tasks with time shift
            setTimeout(handle, generatorConfig.heartbeat / 2);
        });

    feed.on('create', (changes)=>{
        let tasks = [];
        changes.map(change=>{
            tasks = tasks.concat(change.docs.map(d=>{
                    return processor.generate(d, change.dbName);
                }).filter(Boolean));
        });

        if (tasks.length) {
            saveResult(tasks);
        }
    });


    /////////////////////////////////////////////////////////////////////////////
    /*
    interface Task {
         _id: string,
         _rev?: string,
         type: string,
         name: string,

         // extra options
         data?  : any,
         user?  : string,
         db?    : string,
         doc_id?: string,
         doc_rev?: string,
         status?: string,
         created: number,

         // only for failed task
         err?: string,
         failCount?: number
     }
     */

    // Task Watcher

    let isRunning = false;

    /**
     *
     */
    function handle(){
        setTimeout(handle, generatorConfig.heartbeat);
        if(isRunning){
            logger.log('[%s] : already running', path);
            return;
        }
        isRunning = true;


        return getTaskBatch()
            //setStatus(running) // implement this if needs to run multiple instance of agent
            .then(filterTasks)
            .then(processTasks)
            .then(saveResult)
            .catch(logger.warn)
            .then(()=>{
                isRunning = false;
            });
    }

    /**
     * @returns {Promise.<array<Task>>}
     */
    function getTaskBatch() {
        return taskDb.getAll();
    }

    /**
     * @param {Array<Task>} taskArr
     * @returns {Promise.<array<Task>>}
     */
    function filterTasks(taskArr) {
        if (taskArr.length > 0) {
            return processor.filterTasks(taskArr);
        }
        return Promise.resolve([]);
    }

    /**
     * @param {array<task>} rows
     * @returns {Promise.<array<Task>>}
     */
    function processTasks(rows) {
        if (rows.length > 0) {
            logger.log('[%s] : process %d tasks', path, rows.length);
            var timeout;
            try {
                timeout = parseInt(generatorConfig.heartbeat / rows.length); //jshint ignore:line
            } catch (e) {
                timeout = defaultTimeout;
            }
            if (timeout > defaultTimeout) {
                timeout = defaultTimeout;
            }

            let promiseArr = rows.map((row, i)=>{
                return timeoutPromise(i * timeout)
                    .then(processTask.bind(this, row));
            });
            return Promise.all(promiseArr);
        }
        else{
            return Promise.resolve(rows);
        }
    }

    function saveResult(rows){
        var docs = rows.filter((doc)=>{
            return !doc.skip;
        });
        if (docs.length) {
            return taskDb.updateBatch({docs:docs});
        }
        return Promise.resolve();
    }


    /**
     * Process single task
     * @param {Task} task
     * @returns {Promise.<any>}
     */
    function processTask(task){
        //logger.trace('wrapper [%s] : run task [%s] ', path, task._id);
        return processor.run(task)
            .then(()=>{
                task._deleted = true;
                return task;
            })
            .catch(e=>{
                setTaskError(task, e);
                logger.warn('[%s] : error [%s]: ', path, task._id, task.err );
                return task;
            });
    }


    /**
     * Set error data for task
     * @param {Task} task
     * @param {Error} e
     * @returns {*}
     */
    function setTaskError(task, e){
        const msg = (e.message || JSON.stringify(e)) + ' ' + (e.request && (e.request.method + ' ' + e.request.uri) || '');
        if (task.err === msg) {
            task.skip = true;
        }
        task.err = msg;
        task.failCount = (task.failCount || 0) + 1;
        return task;
    }

}// -Wrapper


/**
 * @param {int} milliseconds
 */
function timeoutPromise(milliseconds){
    return new Promise(pass=>{
        setTimeout(pass, milliseconds);
    });
}

//////////////
module.exports = Wrapper;

/**
 * Created by aliaksandr.krasitski on 6/15/2016.
 */
"use strict";

const getWorker = require('../../worker/all').ext;
const config = require('../../../config.js');
const taskTypes = config.task_types; //jshint ignore:line

function Executor(){
    const self = this;

    self.run = (task)=>{
        const type = task.data.type;
        if(!type){
            return Promise.reject({status:400, message:"Task `type` is not present"});
        }


        //TODO remove before production
        if (type === 'dev-clean') {
            return require('../../worker/ext/dev').clean()
                .then(()=>{
                    console.log('DBs were cleared. Please restart the agent');
                    process.exit();
                });
        }

        const workers = getWorkers(type);

        if(!workers || !workers.length) {
            return Promise.reject({status:400, message:"Cannot handle task for type " + type});
        }
        else {
            return Promise.all(workers.map((worker)=>{return worker.execute(task.data);}));
        }
    };

    function getWorkers(type) {
        return Object.keys(taskTypes).map((key)=>{
                return taskTypes[key].indexOf(type) > -1 ? getWorker(key) : null;
            })
            .filter(Boolean);
    }
}

module.exports = new Executor();
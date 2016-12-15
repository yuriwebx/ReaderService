/**
 * Created by aliaksandr.krasitski on 4/29/2016.
 */
"use strict";
const executor = require('./executor');
const cfg = require('../../../config.js').task_generator; //jshint ignore:line
const type = cfg.type.ext;
const logger = require('../../util/log').getLogger(__filename);
const failCountLimit = cfg.failCountLimit || 20;

const separator = '_';

function Processor() {
    const self = this;

    self.run = (task)=>{
        return executor.run(task);
    };

    self.filterTasks = (tasks)=>{
        return tasks
            .filter((r)=>{
                return r._id.split(separator).length > 1;
            })
            .filter(task=> {
                var tooMuchErrors = task.failCount >= failCountLimit;
                if (tooMuchErrors) {
                    logger.log('[ext] : too much fails for task: %s', task && task._id);
                }
                return !tooMuchErrors;
            })
            .sort((a, b)=>{
                //handle dependent documents in correct order
                return cfg.priority[a._id.split(separator)[0]] - cfg.priority[b._id.split(separator)[0]];
            });
    };

    self.generate = (input)=>{
        return {
            _id: input.doc.type + separator + input.doc._id,
            data: input.doc,
            created: Date.now(),
            type: type
        };
    };
}

module.exports = Processor;
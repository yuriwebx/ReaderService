"use strict";

const nano = require('../../conf/db_init');
const names = require('../../conf/db_names');
const idGenerator = require('../../util/id-generator');

module.exports = DiscussionMessage;
////////////////////////

function DiscussionMessage() {
    const self = this;



    /**
     * @param {Message} message
     * @param {Task} task
     * @returns {Promise}
     */
    self.change = (message, task)=>{
        const initRev = message._rev;
        const dbName = names.course(message.classId);
        return nano.db.get(dbName)
            .catch(e=>{
                if(e.statusCode === 404) {
                    // No course db. This can be an 'Independent Study'.
                    return Promise.reject('no course DB ' + dbName);
                }
            })
            .then(()=>{
                return nano.use(dbName).get(idGenerator.message(message._id))
                    .catch(()=>{
                        return {};
                    })
                    .then(res=>{
                        message._rev = res._rev;
                        return nano.use(dbName).insert(message);
                    });
            })
            .then(()=>{
                message._rev = initRev;
                return nano.use(task.db).destroy(message._id, message._rev);
            });
    };
}
"use strict";

const nano = require('../../conf/db_init');
const names = require('../../conf/db_names');

module.exports = Discussion;
////////////////////////

function Discussion() {
    const self = this;



    /**
     * @param {Discussion} discussion
     * @param {Task} task
     * @returns {Promise}
     */
    self.change = (discussion, task)=>{
        const initRev = discussion._rev;
        const dbName = names.course(discussion.classId);
        return nano.db.get(dbName)
            .catch(e=>{
                if(e.statusCode === 404) {
                    // No course db. This can be an 'Independent Study'.
                    return Promise.reject('no course DB ' + dbName);
                }
            })
            .then(()=>{
                return nano.use(dbName).get(discussion._id)
                    .catch(()=>{
                        return {};
                    })
                    .then(res=>{
                        discussion._rev = res._rev;
                        return nano.use(dbName).insert(discussion);
                    });
            })
            .then(()=>{
                discussion._rev = initRev;
                return nano.use(task.db).destroy(discussion._id, discussion._rev);
            });
    };
}
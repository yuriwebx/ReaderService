/**
 * Created by maksim.chartkou on 2016-07-28.
 */
"use strict";

const nano = require('../../conf/db_init');
const names = require('../../conf/db_names');
const schema = require('../../conf/db_schema');
const diffTools = require('../../util/diffTools');

const logger = require('../../util/log').getLogger(__filename);

const queryDb = nano.use(names.query());


module.exports = StudyClass;
////////////////////////

function StudyClass() {
    const self = this;

    const type = {
        INSTITUTIONAL   : 'Institutional',
        PUBLIC          : 'Public',
        MODERATED       : 'Moderated',
        PRIVATE         : 'Private',
        INDEPENDENT     : 'Independent Study',
        CANCELLED       : 'Cancelled'
    };

    const approve = {
        ACCEPTED   : 'Accepted'
        // 'Requested'
        // 'Blocked'
        // TODO: add other types
    };


    /**
     * @param {StudyCourse} course
     * @param {Task} task
     * @returns {Promise.<TResult>}
     */
    self.change = (course, task)=>{
        course; // jshint ignore:line

        let docId = task.doc_id;    // jshint ignore:line
        // try to merge with public record
        return diffTools._getDocs(docId, [queryDb, nano.use(task.db) ])
            .then(docs=>{
                let publicDoc = docs[0] || {};
                let privateDoc = docs[1] || {};
                let userId = task.user;

                // determine whether privateDoc contain fully-operational doc or just diff to the public doc
                // let isDiffRecord = !!publicDoc;

                let isTeacher, isStudent, newClassType;
                if(publicDoc._id){
                    isTeacher = !!publicDoc.teachers[userId];
                    isStudent = !!publicDoc.students[userId];
                }
                else {
                    isTeacher = !!(privateDoc.teachers && privateDoc.teachers[userId]);
                    isStudent = !!(privateDoc.students && privateDoc.students[userId]);
                }



                // only teacher can change class type
                if(isTeacher){
                    newClassType = privateDoc.classType || publicDoc.classType;
                }
                else {
                    newClassType = publicDoc.classType || privateDoc.classType;
                }

                // teacher can modify all fields
                // students can modify only self information

                // allowedChanges and overrideValues - patches for diffTools.apply
                let allowedChanges = {};

                switch(newClassType){

                    // owner is the only one who can change data
                    case type.INDEPENDENT:
                        // do nothing. leave public version available even when course type was changed from public to private
                        return Promise.resolve();

                    // teacher has already accepted all invitations
                    case type.PUBLIC:
                    // need teacher approval
                    /* falls through */
                    case type.MODERATED:
                    // (?) sort of moderated
                    case type.INSTITUTIONAL:
                    // like moderated, but hidden
                    case type.PRIVATE:

                        if(isTeacher){
                            allowedChanges = privateDoc;
                            // TODO: merge actions data
                        }
                        else if(isStudent) {
                            allowedChanges = {
                                students:{}
                            };
                            var st = privateDoc.students && privateDoc.students[userId] || {};
                            allowedChanges.students[userId] = {
                                actions     : st.actions,
                                modifiedAt  : st.modifiedAt,
                                confirmationStatus : st.confirmationStatus
                            };
                        }
                        break;
                    default:
                        logger.error('StudyClass: unknown study type:', newClassType);
                }

                // make changes and save
                let merge = diffTools.apply(allowedChanges, publicDoc, diffTools.resolve.deepUnique);


                // ensure we can insert&update record
                if (publicDoc._id) {
                    merge._rev = publicDoc._rev;
                }
                else {
                    delete merge._rev;
                }

                return updatePublic(merge)
                    .then(()=>{
                        return nano.use(task.db).destroy(privateDoc._id, privateDoc._rev);
                    });
            });
    };


    /**
     * @param {StudyClass} doc
     * @returns {Promise.<TResult>}
     */
    function updatePublic(doc) {
        const courseDbName = names.course(doc.classId);

        return queryDb.insert(doc)
            .then(()=>{
                if(doc.status !== type.CANCELLED) {
                    let studentsApproved = Object.keys(doc.students).filter(userId=>{
                        return doc.students[userId].teacherConfirmationStatus === approve.ACCEPTED;
                    });
                    let courseMembers = new Set(Object.keys(doc.teachers).concat(studentsApproved));

                    return _createCourseDatabase(courseDbName)
                        .then(()=> {
                            return nano.user.set_access(courseDbName, courseMembers);  // jshint ignore:line
                        });
                }
                else{
                    return _deleteCourseDatabase(courseDbName)
                        .catch(e=>{
                            if(e.statusCode === 404) {
                                logger.warn('could not remove non existing DB', courseDbName);
                            }
                            else {
                                throw e;
                            }
                        });
                }
            });

    }

    /**
     * @param {String} courseDbName
     * @returns {Promise.<TResult>}
     * @private
     */
    function _createCourseDatabase(courseDbName){
        return nano.db.create(courseDbName)
            .then(()=>{
                return nano.use(courseDbName).insert(schema.view.course_rw);  // jshint ignore:line
            })
            .then(()=>{
                return nano.use(courseDbName).insert(schema.access.course_rw);  // jshint ignore:line
            })
            .then(()=>{
                logger.log('course db created: ', courseDbName);
            })
            .catch(e=>{
                if(e.statusCode === 412){ // The database could not be created, the file already exists
                    return null;
                }
                else {
                    throw e;
                }
            });
    }


    function _deleteCourseDatabase(courseDbName){

        return nano.db.destroy(courseDbName)
            .then(()=>{
                logger.log('course db removed: ', courseDbName);
            });
            // TODO: remove user subscriptions
    }


}





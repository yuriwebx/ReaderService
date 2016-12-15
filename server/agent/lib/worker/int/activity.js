/**
 * Created by maksim.chartkou on 2016-08-24.
 */
"use strict";

const nano = require('../../conf/db_init');
const names = require('../../conf/db_names');

const privateDbUrl = require('./../../../config').db.local_url; //jshint ignore:line

const privateDb = nano.reinit(privateDbUrl).use(names.private());

module.exports = Activity;
////////////////////////

function Activity() {
    const self = this;



    /**
     * @param {StudyCourse} activity
     * @param {Task} task
     * @returns {Promise}
     */
    self.change = (activity, task)=>{
      let userId = task.user;

      // copy record to private database (for future use)
      return privateDb.get('activity-' + userId)
        .catch(()=>{
          return { _id : 'activity-' + userId, activity: {} };
        })
        .then(doc=>{
          activity._id = doc._id;
          activity._rev = doc._rev;

          //keep old activities (courses)
          const oldActivities = {};
            Object.keys(doc.activity).forEach(key=>{
              if (!activity.activity.hasOwnProperty(key)) {
                  activity.activity[key] = doc.activity[key];

                  oldActivities[key] = doc.activity[key];
              }
          });

          return privateDb.insert(activity)
              .then(_moveOldActivities.bind(self, userId, oldActivities));
        })
        // copy to course db
        .then(()=>{
          let activities = activity.activity || {};

            return Promise.all(
              Object.keys(activities)
                .filter(studyId=>activities[studyId].isClass)
                .map(studyId=>{
                  return nano.db.get(names.course(studyId))
                      .catch((e)=>{
                          if(e.statusCode === 404) {
                              // No course db. This can be an 'Independent Study'.
                              return true;
                          }
                          else {
                              throw e;
                          }
                      })
                      .then((res)=>{
                          if (res.db_name) { //jshint ignore:line
                              return _updateCourseActivity(userId, studyId, activities[studyId] );
                          }
                          return null;
                      });
                })
            );
        });
    };

    //create job
    function _moveOldActivities(userId, activities) {
        const activityKeys = Object.keys(activities);

        if (activityKeys.length) {
            var userQuery = nano.use(names.user(userId));
            var userRW = nano.use(names.user_rw(userId)); //jshint ignore:line


            return userQuery.get('activity')
                .catch((err)=>{
                    if(err.statusCode === 404){
                        return {
                            _id: 'archive-activity',
                            type: 'activity',
                            activity: {}
                        };
                    }
                    else{
                        throw err;
                    }
                })
                .then((res)=>{
                    activityKeys.forEach(key=>{
                        res.activity[key] = activities[key];
                    });

                    return userQuery.insert(res);
                })
                .then(()=>{
                    //TODO course record
                    return userRW.list({startkey: 'usernotes', endkey: 'usernotes' + '\uffff', include_docs: true}) //jshint ignore:line
                        .then((res)=>{
                            const notes = res.rows.map((r)=>{
                                return r.doc;
                            });
                            let oldNotes = notes.filter(note=>{
                                return activityKeys.indexOf(note.content.courseId) > -1;
                            });

                            if (oldNotes.length) {
                                const moveToQuery = oldNotes.map(n=>{
                                    const note = JSON.parse(JSON.stringify(n));
                                    delete note._rev;
                                    note._id = 'archive-' + n._id;
                                    return note;
                                });
                                return userQuery.bulk({docs: moveToQuery})
                                    .then(()=>{
                                        const notesToDelete = oldNotes.map(note=>{
                                            return {
                                                _id: note._id,
                                                _rev: note._rev,
                                                _deleted: true
                                            };
                                        });

                                        return userRW.bulk({docs: notesToDelete});
                                    });
                            }

                            return Promise.resolve();
                        });
                });
        }

        return Promise.resolve();
    }

    function _updateCourseActivity(userId, courseId, data){
        let db = nano.use(names.course(courseId));
        return db.get('activity-' + userId)
            .catch(function(err){
              if(err.statusCode === 404){
                 return _getEmptyDoc(userId);
              }
              else{
                throw err;
              }
            })
            .then(function(doc){
                if (doc.activity.readingDuration === data.readingDuration) {
                    return Promise.resolve('no changes');
                }

                // copy data
                doc.meta = {userId: userId, courseId: courseId}; // meta contains info, hidden in key
                doc.activity = data;

                // remove some not useful data
                Object.keys(data.items).forEach(pubId=>{
                   delete data.items[pubId].logs;
                   delete data.items[pubId].summary;
                   delete data.items[pubId].discussion;

                    // leave 4 items in progress (3 +1 for today)
                    data.items[pubId].progress = Object.keys(data.items[pubId].progress).sort((a,b)=>b - a).slice(0, 4)
                        .reduce((result, item)=>{
                            result[item] = data.items[pubId].progress[item];
                            return result;
                        }, {});
                });

                return db.insert(doc);
            });
    }


    /**
     *
     */
    function _getEmptyDoc(userId){
      var emptyDoc = {
              _id: 'activity' + (userId ? '-' + userId : ''),
              type: 'activity',
              activity : {}
            };
      if(userId){
        emptyDoc.owner = userId;
      }
      return emptyDoc;
    }



}
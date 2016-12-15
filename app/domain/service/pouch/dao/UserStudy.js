define([
    './DB',
    '../tools',
    'underscore'
], function(DB, tools, _) {
    "use strict";
    var dayMs = 86400 * 1000;

    //////////////////////////////////////////////
    return {
        get: get,
        getForUsers : getForUsers,

        getRecentId: getRecentPubId,
        create: create,
        save : save,

        getPublicationSummary : getPublicationSummary,
        getPublicationsSummary : getPublicationsSummary,
        setCurrentStudyGuide : setCurrentStudyGuide,
        update: update,
        trackProgress: trackProgress,
        getStats: getStats,
        persistParagraphSummary: persistParagraphSummary,
        persistEssay: persistEssay,
        persistTest: persistTest,

        clearActivity: clearActivity
    };

    //////////////////////////////////////////////
    /**
     * get publication activity
     */
    function get(key) {
        return _getDoc()
          .then(function(doc){
            return doc.activity[key] || _defaultActivity();
          })
          .catch(function(){
            return null;
          });
    }

    function _defaultActivity() {
        return {
            items:{}
        };
    }

    // get activity doc
    function _getDoc() {
        return DB.userRW().get('activity')
          .catch(function(){
            return _getEmptyDoc();
          });
    }

    // save activity doc (should be got from userRW database)
    function _saveDoc(doc) {
        // save to user db
        return DB.userRW().put(doc);
    }



    /**
     * get activity for users
     * @return {Promise<Array<Activity>>}
     */
    function getForUsers(userIds, courseId){
      var keys = userIds.map(function(id) {return getActivityId(id);});
      return DB.course(courseId).byIds(keys);
    }

    function getActivityId(userId) {
        return 'activity-' + userId;
    }


    function getRecentPubId(limit, isClass){
      return _getDoc()
        .then(function(doc){
          var log = [];
          for (var pubId in doc.activity) {
            if(doc.activity.hasOwnProperty(pubId)){
              log.push({ lastOpenedAt:doc.activity[pubId].lastOpenedAt, pubId: pubId, isClass: doc.activity[pubId].isClass });
            }
          }
          return log;
        })
        .then(function(log){
          return log
              .filter(function(a) {
                  return a.isClass === isClass;
              })
              .sort(function(a, b){
                  return b.lastOpenedAt - a.lastOpenedAt;
              });
        })
        .then(function(log){
          return log.slice(0, limit);
        })
        .then(function(log){
          return log.map(function(item){
            return item.pubId;
          });
        });
    }

    /**
     *
     */
    function save(publicationId, classId, activityData) {
        return _getDoc()
            .then(function (doc) {
                var activity = doc.activity[classId || publicationId] || _defaultActivity();

                activity.readingDuration    = activityData.readingDuration;
                activity.readingWordNumber  = activityData.readingWordNumber;
                activity.isClass            = !!classId;
                activity.lastOpenedAt       = activityData.recordedAt || activityData.lastTouchedAt;
                activity.firstOpenedAt      = activity.firstOpenedAt || activity.lastOpenedAt;
                activity.currentItemId      = activityData.currentStudyItemId || activity.currentItemId;

                var itemActivity = activity.items[activity.currentItemId] || {};
                activity.items[activity.currentItemId] = itemActivity;

                itemActivity.summary = itemActivity.summary || {};
                itemActivity.summary.readingProgress = activityData.readingProgress;
                itemActivity.summary.readingPosition = activityData.readingPosition;
                itemActivity.summary.completed = activityData.completed;
                itemActivity.summary.lastReadedAt = activityData.recordedAt || activity.lastOpenedAt;
                itemActivity.summary.firstReadedAt = itemActivity.summary.firstReadedAt || itemActivity.summary.lastReadedAt;
                itemActivity.summary.bookId = publicationId;
                itemActivity.summary.locations = itemActivity.summary.locations || [];

                if (activity.isClass) {
                    itemActivity.progress = setDailyProgress(itemActivity.progress, activityData);
                }

                activity.readingProgress = sumProgress(activity.items);
                activity.completed = isCompleted(activity.items);

                doc.activity[classId || publicationId] = activity;
                return doc;
            }).then(function(doc){
                return _saveDoc(doc);
            });
    }

    function setDailyProgress(progress, input) {
        //var startDay   = new Date();
        //var endDay     = new Date();
        var totalReadingDuration = 0;
        var todayProgress;//, dayBeforeStart;
        var _now = new Date().getTime();

        var today = new Date();
        today.setHours(0,0,0,0);
        today = today.getTime();

        progress = progress || {};
        //TODO
        //if(false) {
        //    endDay = endDay.setMinutes(startDay.getMinutes() + 1);
        //    dayBeforeStart = startDay.setMinutes(startDay.getMinutes() - 1);
        //}
        //else {
        //    startDay = startDay.setHours(0,0,0,0);
            //endDay   = endDay.setHours(23,59,59,999);
            //dayBeforeStart = new Date(startDay).setDate(new Date(startDay).getDate() - 1);
        //}
        var keys = Object.keys(progress)
            .map(function(date) {
                return parseInt(date);
            })
            .sort(function(a, b) {
                return b > a;
            });

        todayProgress = progress[today];
        var dayBefore = keys[1] || false;
        if (dayBefore) {
            totalReadingDuration = dayBefore.totalReadingDuration;
        }

        if (!todayProgress) { //create new user studies progress
            todayProgress = {
                date                 : _now,
                startedAt            : _now,
                finishedAt           : _now,
                totalReadingDuration : totalReadingDuration + input.readingDuration,
                readingDuration      : input.readingDuration,
                readingWordNumber    : input.readingWordNumber,
                writtenWordNumber    : 0 // TODO: set the real value
            };
        }
        else {
            todayProgress.date = _now;
            todayProgress.finishedAt = _now;
            todayProgress.totalReadingDuration += input.readingDuration;
            todayProgress.readingDuration += input.readingDuration;
            if (todayProgress.readingWordNumber < input.readingWordNumber) {
                todayProgress.readingWordNumber = input.readingWordNumber;
            }
            todayProgress.writtenWordNumber = 0; // TODO: set the real value
        }
        progress[today] = todayProgress;

        return progress;
    }

    function isCompleted(items) {
        var studyKeys = Object.keys(items);

        return studyKeys.filter(function(key) {
            return !items[key].summary.completed;
        }).length === 0;
    }

    function sumProgress(items) {
        var total = 0;
        var studyKeys = Object.keys(items);

        if (!studyKeys.length) {
            return 0;
        }

        studyKeys.forEach(function(key) {
            total += items[key].summary.readingProgress || 0;
        });

        return Math.ceil(total / studyKeys.length);
    }


    function getPublicationSummary(pubId){
      return get(pubId);
    }
    function getPublicationsSummary(pubIds){

       return _getDoc()
       .then(function(doc){

          var summaryObj = {};
          for(var pubId in doc.activity){
            if(pubIds.indexOf(pubId) >= 0){
              summaryObj[pubId] = doc.activity[pubId];
            }
          }
          return summaryObj;

       });
    }

    /**
     * get publication activity
     */
    function create(publicationId, classId) {
        return get(classId || publicationId)
          .then(function(doc){
              var now = new Date().getTime();
              var currentItemId = tools.guid();

              if (!doc.currentItemId) {
                  doc.items[currentItemId] = {
                      summary: {
                          readingProgress: 0,
                          readingPosition: {},
                          completed: false,
                          lastReadedAt: now,
                          firstReadedAt: now,
                          bookId: publicationId,
                          locations: []
                      }
                  };
              }

              //book, study course based on book format
              return {
                  //"userId": "0a3f3ddcc915953d334b887486b804b4", exist for class
                  "_id": doc._id || tools.guid().split('-').join(''),
                  "type": "UserStudy",
                  "publicationId": publicationId,
                  "classId": classId,
                  "firstOpenedAt": doc.firstOpenedAt || now,
                  "lastTouchedAt":  doc.lastOpenedAt || now,
                  "completed":  doc.completed || false,
                  "readingDuration":  doc.readingDuration || 0,
                  "readingPosition":  {},
                  "readingProgress":  doc.readingProgress || 0,
                  "readingWordNumber":  doc.readingWordNumber || 0,
                  "currentStudyItemId": doc.currentItemId || currentItemId,
                  //TODO prevent to create random activity for study courses > 1 book
                  "studyItems": setStudyItems(doc.items)
              };
          });
    }

    function setStudyItems(items) {
        return Object.keys(items)
            .map(function(id) {
                var summary = items[id].summary;
                return {
                    "id": id,
                    "bookId": summary.bookId,
                    "completed": summary.completed,
                    "readingProgress": summary.readingProgress,
                    "readingPosition": summary.readingPosition,
                    "firstOpenedAt": summary.firstReadedAt,
                    "lastOpenedAt":  summary.lastReadedAt
                };
            });
    }

    function setCurrentStudyGuide(pubId, studyGuideId) {
        return get(pubId)
            .then(function(activity) {
                activity.currentStudyGuideId = studyGuideId;

                return _getDoc().then(function(res) {
                    res.activity[pubId] = activity;

                    return DB.userRW().put(res);
                });
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
      return emptyDoc;
    }

    function update(pubId, data) {
        return _getDoc()
            .then(function(doc) {
                doc.activity[pubId] = data;

                return DB.userRW().put(doc);
            });
    }

    /**
     * Log progress
     *
     */
    function trackProgress(data/*, params*/) {
        return _getDoc()
            .then(function(doc) {
                var date = parseInt(new Date().getTime() / dayMs) * dayMs;
                var curActivity = doc.activity[data.study.studyId] || doc.activity[data.study.publicationId];
                curActivity = curActivity || {items: {}};
                var itemActivity = curActivity.items[data.study.studyItemId] || {logs: {}};
                curActivity.items[data.study.studyItemId] = itemActivity;

                itemActivity.logs = itemActivity.logs || {};

                var log = itemActivity.logs[date] || {};
                itemActivity.logs[date] = log;

                if (data.progressType === 'jump') {
                    log.jump = log.jump || [];
                    log.jump.push({
                        from: data.progressData.from,
                        to: data.progressData.to,
                        createdAt: new Date().getTime()
                    });
                }
                else {
                    //min, max
                    log[data.progressData.paragraphLocator] = log[data.progressData.paragraphLocator] || {};
                    log[data.progressData.paragraphLocator][data.progressType] = {
                        createdAt: new Date().getTime(),
                        wordsCount: data.progressData.wordsCount
                    };
                }

                return _saveDoc(doc);
            });
    }

    function getStats() {
        return _getDoc()
            .then(function(res) {
                var activities = res.activity;
                var itemKeys = Object.keys(activities);

                var out = {
                    books: {
                        inProgress: 0,
                        completed: 0
                    },
                    quizzes: {
                        completed: 0,
                        pending: 0
                    },
                    flashcards: {
                        mastered: 0,
                        pending: 0
                    },
                    vocabularyTermsCount: 0,
                    totalReadingTime: 0
                };

                //TODO calculate other properties: quizzes, flashcards
                itemKeys.forEach(function(key) {
                    var activity = activities[key];
                    if (!activity.isClass) {
                        if (activity.completed) {
                            out.books.completed++;
                        }
                        else {
                            out.books.inProgress++;
                        }

                        out.totalReadingTime += (activity.readingDuration || 0);
                    }
                });

                return convertStats(out);
            });
    }

    function convertStats(stats) {
        return {
            booksInProgressCount: stats.books.inProgress,
            completedBooksCount: stats.books.completed,
            vocabularyTermsCount: stats.vocabularyTermsCount,
            totalReadingTime: stats.totalReadingTime,
            completedQuizzesCount: stats.quizzes.completed,
            pendingQuizzesCount: stats.quizzes.pending,
            masteredFlashcardsCount: stats.flashcards.mastered,
            pendingFlashcardsCount: stats.flashcards.pending
        };
    }

    function persistParagraphSummary(locator, /*publicationId, recordedAt, */studyId, studyItemId, text) { //jshint ignore:line
        return get(studyId)
            .then(function(res) {
                var summary = res.items[studyItemId].summary;
                if (!summary.paragraphSummaries) {
                    summary.paragraphSummaries = {};
                }

                var wordsNumber = getWordsNumber(text);
                var paragraphSummary = {
                    locator: {
                        type        : "B",
                        paragraphId : locator.paragraphId,
                        index       : 1
                    },
                    text           : text,
                    wordsNumber    : wordsNumber,
                    completedAt    : Date.now()
                };

                if (paragraphSummary.wordsNumber) { // completedCondition ?
                    paragraphSummary.completed = Date.now();
                }

                summary.paragraphSummaries[locator.paragraphId] = paragraphSummary;

                return update(studyId, res);
            });
    }

    function getWordsNumber(text) {
        var textMatch = text.match(/\S+/g);
        return textMatch ? textMatch.length : 0;
    }

    function persistEssay(essayTask, studyId, studyItemId, text) {
        return get(studyId)
            .then(function(res) {
                var summary = res.items[studyItemId].summary;

                if (!summary.essays) {
                    summary.essays = {};
                }

                var essay = summary.essays[essayTask._id] || {};

                var wordsNumber = getWordsNumber(text);
                essay = {
                    text              : text,
                    paragraphId       : essayTask.locator.paragraphId,
                    wordsNumber       : wordsNumber,
                    completed         : wordsNumber >= essayTask.wordsLimit,
                    startedAt         : essay.startedAt || Date.now()
                };

                if (essay.completed) {
                    essay.completedAt = Date.now();
                }

                summary.essays[essayTask._id] = essay;

                return update(studyId, res);
            });
    }

    function persistTest(req) {
        return get(req.studyId)
            .then(function(res) {
                var summary = res.items[req.studyItemId].summary;

                var quizProps        = ['correctAnswersCount', 'totalAnswersCount', 'locator'];
                var flashcardProps   = ['active', 'locator', 'testType'];
                var testType         = req.type === 'quiz' ? 'quizzes' : 'flashcards';

                if (!summary[testType]) {
                    summary[testType] = {};
                }

                var test = summary[testType][req.id] || {};

                if (testType === 'quizzes') {
                    _.extend(test, _.pick(req, quizProps), {
                        executionDuration : 0,
                        executedAt        : Date.now()
                    });
                    test.status = test.correctAnswersCount === test.totalAnswersCount ? 'Completed' : 'Partial';
                }
                else {
                    _.extend(test, _.pick(req, flashcardProps));
                }

                summary[testType][req.id] = test;

                return update(req.studyId, res);
            });
    }

    function clearActivity(ids) {
        return _getDoc()
            .then(function(doc) {
                var update = false;
                ids.forEach(function(id) {
                    if (doc.activity.hasOwnProperty(id)) {
                        update = true;
                        delete doc.activity[id];
                    }
                });

                if (update) {
                    return _saveDoc(doc);
                }
                return tools.Promise.resolve();
            });
    }

});

/**
 * Activity
 */

define([
    '../tools',
    '../dao/UserStudy',
    '../dao/StudyClass',
    '../dao/Publication',
    '../dao/StudyCourse',
    '../dao/User'
], function(tools, UserStudy, StudyClass, Publication, StudyCourse, User) {
    "use strict";
    var Promise = tools.Promise;

    return {
        POST:{
            persistprogress: persistprogress,
            initiate:initiate,
            searchuserstudy: search, //for course only?
            readingprogresstracking: trackProgress,
            persistParagraphSummary: persistParagraphSummary,
            persistTest: persistTest,
            persistEssay: persistEssay
        }
    };

    function persistprogress(data) {
       return UserStudy.save(data.publicationId, data.classId, data);
    }

    function persistParagraphSummary(req) {
        return UserStudy.persistParagraphSummary(req.locator, /*req.publicationId, req.recordedAt, */req.studyId, req.studyItemId, req.text)
            .then(function() {
                return req.studyId;
            });
    }

    function persistTest(req) {
        return UserStudy.persistTest(req)
            .then(function() {
                return req.studyId;
            });
    }

    function persistEssay(req) {
        return Publication.getById(req.publicationId)
            .then(function(pub) {
                var essayTask = pub.essayTask.filter(function(t) {
                    return t._id === req.essayId;
                })[0];

                if (essayTask) {
                    return UserStudy.persistEssay(essayTask, req.studyId, req.studyItemId, req.text);
                }

                return Promise.reject('Cannot find essay ' + req.essayId);
            })
            .then(function() {
                return req.studyId;
            });
    }


    //
    // DATA: "{"mode":"Publication","publicationId":"db5d14e1eeacc897ad5c6c955ee8b646","classId":""}"
    function initiate(data) {
        var mode = data.mode;
        var publicationId = data.publicationId;
        var classId = data.classId;

        if (mode === 'Publication') {
            return UserStudy.create(publicationId);
        }
        if (mode === 'Class') {
            return Promise.all([
                    UserStudy.get(classId),
                    Publication.getById(publicationId)
                ])
                .then(function(res) {
                    var pub = res[1];
                    //syllabus
                    if (pub.type === 'StudyCourse') {
                        res.push(StudyCourse.get(pub._id));
                    }
                    else if (pub.type === 'Book') {
                        res.push([pub]);
                    }
                    else {
                        //TODO check each mode
                        if (pub.items) {
                            var pubIds = pub.items.map(function (item) {
                                    return item.bookId;
                                }) || [];

                            res.push(Publication.getByIds(pubIds));
                        }
                        else {
                            //pub.type === 'StudyGuide'
                            res.push([pub]);
                        }
                    }

                    return Promise.all(res);
                })
                .then(function(res) {
                    var activity = res[0];
                    var info = res[1];
                    var itemsInfo = res[2] || [info];

                    //syllabus
                    if (info.type === 'StudyCourse') {
                        itemsInfo = itemsInfo.studyCourseItems;
                    }

                    var now = new Date().getTime();

                    var studyItems = info.type === 'StudyCourse' ? itemsInfo : getStudyItems(info.items, itemsInfo);

                    var currentItemId = activity.currentItemId || studyItems[0].id;
                    studyItems.forEach(function(item) {
                        setProgress(item, activity.items, currentItemId);
                    });


                    //book, study course based on book format
                    return {
                        //"userId": "0a3f3ddcc915953d334b887486b804b4", exist for class
                        "_id": classId,
                        "type": "UserStudy",
                        "publicationId": publicationId,
                        "classId": classId,
                        "firstOpenedAt": activity.firstOpenedAt || now,
                        "lastTouchedAt":  activity.lastOpenedAt || now,
                        "completed":  activity.completed || false,
                        "readingDuration":  activity.readingDuration || 0,
                        "readingProgress":  activity.readingProgress || 0,
                        "readingWordNumber":  activity.readingWordNumber || 0,
                        "currentStudyItemId": currentItemId,
                        "studyItems": studyItems
                    };
                });
        }

        return Promise.reject('Unavailable when offline');
    }

    function setProgress(info, items, curItem) {
        //TODO check curItem
        var summary = (items[info.id || curItem] || {}).summary || {};

        var now = Date.now();

        info.completed = summary.completed || false;
        info.readingProgress = summary.readingProgress || 0;
        info.readingPosition = summary.readingPosition || {fragmentId: ''};
        info.firstOpenedAt = summary.firstReadedAt || now;
        info.lastOpenedAt = summary.lastReadedAt || now;

        if (info.test) {
            var all = info.test;
            info.quizzes = {};
            info.flashcards = {};
            all.forEach(function(test) {
                if (test.testType === 'Quiz') {
                    if (summary.quizzes && summary.quizzes[test._id]) {
                        info.quizzes[test._id] = summary.quizzes[test._id];
                    }
                    else {
                        info.quizzes[test._id] = {
                            testType : test.testType,
                            locator  : test.locator,
                            status   : 'Not Started'
                        };
                    }
                    info.quizzes[test._id]._id = test._id;
                }
                else {
                    if (summary.flashcards && summary.flashcards[test._id]) {
                        info.flashcards[test._id] = summary.flashcards[test._id];
                    }
                    else {
                        info.flashcards[test._id] = {
                            testType: test.testType,
                            locator: test.locator,
                            active: false
                        };
                    }
                    info.flashcards[test._id]._id = test._id;
                }
            });
        }

        if (info.paraSize) {
            info.paragraphSummaries = summary.paragraphSummaries;
        }

        if (summary.essays) {
            info.essays = summary.essays;
            Object.keys(info.essays)
                .forEach(function(key) {
                    var out = info.essays[key];
                    out._id = key;
                    return out;
                });
        }
    }

    function getStudyItems(studyInfo, pubInfo) {

        //class from book
        if (!studyInfo) {
            return pubInfo;
        }

        return studyInfo.map(function(item) {
            var pub = pubInfo.filter(function(i) {
                    return i.bookId === item._id;
                })[0] || {};

            var fields = ['author', 'bookId', 'description', 'finishingParagraphId', 'id', 'name', 'paragraphId'];

            fields.forEach(function(name) {
                pub[name] = item[name] || pub[name];
            });

            return pub;
        });
    }

    /**
     *
     * req = {classId,filter,category,interval,itemsCount }
     */
    function search(req) {
        var classId = req.classId;
        var interval = req.interval || 3;
        // var itemsCount = req.itemsCount || 20;
        var startDay   = new Date().setHours(0,0,0,0);

        return StudyClass.getById(classId)
        .then(function(course){
            var courseParticipants = Object.keys(course.students).concat(Object.keys(course.teachers));
            return tools.Promise.all([
                course,
                UserStudy.getForUsers( courseParticipants, classId ),
                User.getByIds( courseParticipants )
            ]);
        })

        .then(function(data) {
            var course = data[0];
            var activities = data[1] || [];
            var users = data[2] || [];

            // user info
            var usersProgress = users.reduce(function(result, user){
                var data = {
                    userId      : user.userId,
                    email       : user.email && user.email[0],
                    firstName   : user.firstName,
                    lastName    : user.lastName,
                    progress    : [],
                    photo       : user.photo, // TODO
                };
                result[data.userId] = data;
                return result;
            }, {});

            // usersProgress is an object here!
            // usersProgress.slice(0, itemsCount); // TODO: offset?

            // user progress info
            activities.forEach(function(activity){
                activity = activity || {};
                var userId = activity.meta && activity.meta.userId;
                var classActivity = activity.activity && activity.activity[classId];
                if(!classActivity || !usersProgress[userId] || !classActivity.isClass){
                    return;
                }

                // collect all progress items
                var items = [];
                Object.keys(classActivity.items || {}).forEach(function(bookId){
                    var progressData = classActivity.items[bookId].progress || {};
                    Object.keys(progressData).forEach(function(dayTimestamp){
                        if(dayTimestamp > startDay){
                            // remove current day
                            return;
                        }
                        // add some fields
                        progressData[dayTimestamp].studyId = classId;

                        items.push( progressData[dayTimestamp] );
                    });

                }, []);


                // sort and cut
                items.sort(function(a,b){
                   return a.date < b.date;
                }).slice(0, interval).reverse();

                // fill to requested length
                while(items.length < interval){
                  items.push({});
                }

                // convers data structure
                usersProgress[userId].progress = usersProgress[userId].progress.concat(items);
            });

            return {
                usersProgress: Object.keys(usersProgress).map(function(key){ return usersProgress[key]; }),
                middleParams : {
                    readingWord          : course.expectedDailyWork * 140,
                    readingDuration      : course.expectedDailyWork,
                    expectedTotalReadingTime : new Date(new Date() - course.scheduledAt).getDate() * course.expectedDailyWork
                }
            };
        });
        /*
            {
              "usersProgress": [
                {
                  "userId": "f985666163187873c68a954cc6001a68",
                  "email": "editor@irls",
                  "firstName": "Sarah",
                  "lastName": "Editor",
                  "progress": [
                    {
                      "studyId": "3d8d51a721b6dbbadc9f0eeba4a08c89",
                      "date": 1471884141094,
                      "startedAt": 1471869186627,
                      "finishedAt": 1471884141094,
                      "totalReadingDuration": 3632338,
                      "readingDuration": 3632338,
                      "readingWordNumber": 35807,
                      "writtenWordNumber": 0
                    },
                    {},
                    {}
                  ]
                }
              ],
              "middleParams": {
                "readingDuration": 1800000,
                "readingWord": 4200,
                "expectedTotalReadingTime": 14400000
              }
            }
        */
    }

    function trackProgress(data, params) {
        return UserStudy.trackProgress(data, params);
    }


});

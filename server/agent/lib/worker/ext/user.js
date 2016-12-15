"use strict";
/* jshint -W106 */

const nano = require('../../conf/db_init');
const names = require('../../conf/db_names');
const schema = require('../../conf/db_schema');
const idGenerator = require('../../util/id-generator');
const error = require('../../util/error-handler');
const queryDb = nano.use(names.query());


function User() {
    const self = this;

    const dayInMillis = 24 * 60 * 60 * 1000;

    function getUserRole(obj) {
        let roles = [];
        if (obj.adminRole) {
            roles.push('admin');
        }
        if (obj.editorRole) {
            roles.push('editor');
        }

        return roles.length === 0 ? ['user'] : roles;
    }

    self.execute = (input)=>{
        switch (input.type) {
            case 'UserProfile':
                return self.manageUser(input);
            case 'UserPublication':
                return self.userPublication(input);
            case 'UserStudy':
                return self.userStudy(input);
            case 'UserStudyStatistics':
                return self.userStatistics(input);
            case 'Setting':
                return self.settings(input);
            case 'Material':
                return self.materials(input);
            case 'DictionaryTermStudy':
                return self.flashcards(input);
            default: {
                return error.bad('Can\'t process task for type ' + input.type);
            }
        }
    };

    self.manageUser = (user)=>{
        return updateQueryDB(user)
            .then(updateSystemUser(user));
    };

    function updateQueryDB(user) {
        const userId = idGenerator.user(user._id);
        return queryDb.get(userId)
            .catch(error.notFoundOk)
            .then((res)=>{
                if (isPublicInfoUpdated(user, res)) {
                    res._id = userId;
                    res.userId = user._id;
                    res.type = 'user';
                    res.created = user.registeredAt;
                    res.external = user.externaluserid;

                    //TODO fill in res.profile
                    res.profile = {
                        full: '',
                        src: ''
                    };

                    res = setCommonInfo(user, res);

                    return queryDb.insert(res);
                }

                return Promise.resolve();
            });
    }

    function isPublicInfoUpdated(remote, local) {
        if (!local.roles || local.roles.length !== getUserRole(remote).length) {
            return true;
        }
        if (!local.email || local.email[0] !== remote.email) {
            return true;
        }
        if (local.firstName !== remote.firstName) {
            return true;
        }
        if (local.lastName !== remote.lastName) {
            return true;
        }
        if (local.photo !== remote.photo) {
            return true;
        }
        if (local.emailConfirmationStatus !== remote.emailConfirmationStatus) {
            return true;
        }
        if (local.photoLink !== remote.photoLink) {
            return true;
        }
        if (local.status !== getStatus(remote)) {
            return true;
        }
        return false;
    }

    function updateSystemUser(userObj) {
        return function() {
            const userId = userObj._id;

            //the task with empty sync should be omitted.
            if (!userObj.sync) {
                return Promise.resolve({message:'Credentials were not provided for user ' + userId});
            }

            return nano.user.get(userId)
                .catch(error.notFoundOk)
                .then((res)=>{
                    if (isPrivateUserInfoUpdated(userObj, res)) {
                        res.name = userId;
                        res.roles = getUserRole(userObj);
                        res.status = getStatus(userObj);
                        res.email = [userObj.email];
                        res.type = 'user';
                        res.password = userObj.sync.pass;
                        //TODO check if contains sensitive info
                        res.external = userObj.externaluserid;
                        return res._rev ? nano.user.update(res) : nano.user.add(res);
                    }
                    return Promise.resolve();
                })
                .then(()=>{
                    return updateUserDBs(userObj);
                });
        };
    }

    function isPrivateUserInfoUpdated(remote, local) {
        if (!local.roles || local.roles.length !== getUserRole(remote).length) {
            return true;
        }
        if (!local.email || local.email[0] !== remote.email) {
            return true;
        }
        if (local.status !== getStatus(remote)) {
            return true;
        }
        if (local.name !== remote._id) {
            return true;
        }
        return false;
    }

    function updateUserDBs(userObj) {
        const userId = userObj._id;

        const user_r = names.user(userId);
        const user_rw = names.user_rw(userId);
        const userDB = nano.use(user_r);
        const userDB_RW = nano.use(user_rw);

        return Promise.all([
                nano.db.create(user_r),
                nano.db.create(user_rw)
            ])
            .then(() => {
                //setup user DBs
                return Promise.all([
                    nano.user.grant_access(user_r, userId),
                    nano.user.grant_access(user_rw, userId),
                    userDB.insert(schema.access.user),
                    userDB.insert(schema.view.user),
                    userDB_RW.insert(schema.access.user_rw),
                    userDB_RW.insert(schema.view.user_rw)
                ]);
            })
            .catch(()=>{})
            .then(()=>{
                const id = 'info';
                return userDB.get(id)
                    .catch(error.notFoundOk)
                    .then((res)=>{
                        if (isPublicInfoUpdated(userObj, res)) {
                            res = setCommonInfo(userObj, res);
                            res.external = userObj.externaluserid;
                            res.hasPassword = userObj.passwordHash && userObj.passwordHash.length !== 0;

                            res._id = id;
                            res.id = userId;
                            res.type = 'info';
                            res.updated = Date.now();

                            return userDB.insert(res);
                        }

                        return Promise.resolve();
                    });
            });
    }
    
    function setCommonInfo(remote, local) {
        local.firstName = remote.firstName;
        local.lastName = remote.lastName;
        local.roles = getUserRole(remote);
        local.status = getStatus(remote);
        local.email = [remote.email];
        local.emailConfirmationStatus = remote.emailConfirmationStatus;
        local.photo = remote.photo;
        local.photoLink = remote.photoLink;

        return local;
    }

    function getStatus(userObj) {
        return userObj.active;
    }

    //not in use
    function manageMyBook(info, userDb) {
        const pubId = info.publicationId;
        var docId;
        switch (info.publicationType) {
            case "StudyClass": {
                docId = 'courses';
                break;
            }
            case "publication": {
                docId = 'books';
                break;
            }
            case "Book": {
                return Promise.resolve("Book notes in Editor app");
            }
            default: {
                return error.bad('Unrecognized publication type ' + info.publicationType);
            }
        }

        return Promise.all([
            updateActivity(info, userDb),
            updateIds(pubId, userDb, docId, info.personal)
        ]);
    }

    //not in use
    function updateActivity(info, userDb) {
        return userDb.get('activity')
            .then((res)=>{
                const bookActivity = res.activity[info.publicationId];

                if (bookActivity) {
                    bookActivity.firstOpenedAt = info.firstOpenedAt;
                    bookActivity.lastOpenedAt = info.lastOpenedAt;
                    bookActivity.currentStudyGuideId = info.currentStudyGuideId;
                    return userDb.insert(res);
                }

                //check if it is syllabus
                return nano.use(names.public()).get(idGenerator.book(info.publicationId))
                    .then((res)=>{
                        if (res.pubType === 'syllabus' || res.pubType === 'notes') {
                            //skip syllabus UserPublication
                            return Promise.resolve();
                        }
                        throw new Error();
                    })
                    .catch(()=>{
                        return error.bad('Cannot find activity for UserPublication ' + info._id);
                    });
            });
    }

    function updateIds(pubId, userDb, docId, add) {
        return userDb.get(docId)
            .then((res)=>{
                const idx = res.ids.indexOf(pubId);

                if (idx === -1) {
                    res.ids.push(pubId);
                    return userDb.insert(res);
                }

                if (!add && idx > -1) {
                    res.ids.splice(idx,1);
                    return userDb.insert(res);
                }

                return Promise.resolve();
            });
    }

    //not in use
    self.userPublication = (info)=>{
        const userDb = nano.use(names.user_rw(info.userId));

        return manageMyBook(info, userDb);
    };

    //not in use
    function updateProgress(summary, studyItem) {
        summary.readingProgress = studyItem.readingProgress;
        summary.firstReadedAt = studyItem.firstOpenedAt;
        summary.lastReadedAt = studyItem.lastOpenedAt;
        summary.completed = studyItem.completed;
        summary.bookId = studyItem.bookId;
        summary.locations = [];

        //StudyGuide
        summary.quizzes = studyItem.quizzes;
        summary.flashcards = studyItem.flashcards;
    }

    //not in use
    function updateLogs(logs, studyItem) {
        const dateKey = getActivityDateKey(studyItem.lastOpenedAt);

        logs[dateKey] = {
            words: studyItem.readingWordNumber,
            progress: studyItem.readingProgress,
            device: 'device'
        };
    }

    //not in use
    function trackActivity(info, userDb) {
        return userDb.get('activity')
            .then((res)=>{
                const activity = res.activity;

                const entityKey = info.classId || info.publicationId;

                if (!activity[entityKey]) {
                    activity[entityKey] = {
                        items: {}
                    };
                }

                activity[entityKey].readingPosition = info.readingPosition.fragmentId;
                activity[entityKey].readingProgress = info.readingProgress;
                activity[entityKey].readingDuration = info.readingDuration;
                activity[entityKey].readingWordNumber = info.readingWordNumber;
                activity[entityKey].currentItemId = info.currentStudyItemId;
                activity[entityKey].isClass = info.classId !== undefined;
                activity[entityKey].completed = info.completed;

                info.studyItems.forEach((studyItem)=> {
                    var item = activity[entityKey].items[studyItem.id] || {
                            summary: {},
                            logs: {}
                        };
                    updateProgress(item.summary, studyItem, info);
                    updateLogs(item.logs, studyItem);

                    activity[entityKey].items[studyItem.id] = item;
                });
                return userDb.insert(res);
            });
    }

    function getActivityDateKey(millis) {
        return parseInt(new Date(millis).getTime() / dayInMillis) * dayInMillis;
    }

    //not in use
    self.userStudy = (info)=>{
        const userDb = nano.use(names.user_rw(info.userId));
        return trackActivity(info, userDb);
    };

    //not in use
    self.materials = (material)=>{
        if (material.editor) {
            return Promise.resolve('Processing user Material in book worker...');
        }
        const userDb = nano.use(names.user_rw(material.userIds[0]));
        return Promise.all([
                userDb.get(idGenerator.usernotes(material.bookId)),
                userDb.get(idGenerator.tags(material.bookId))
            ])
            .catch(()=>{
                return [{
                    _id: idGenerator.usernotes(material.bookId, material.courseId),
                    type: 'usernotes',
                    content: {
                        title: null,
                        cover: null,
                        pubId: material.bookId,
                        courseId: material.courseId
                    },
                    notes: {}
                }, {
                    _id: idGenerator.tags(material.bookId, material.courseId),
                    type: 'tags',
                    content: {
                        pubId: material.bookId,
                        courseId: material.courseId
                    },
                    items: []
                }];
            })
            .then((res)=>{
                const usernotes = res[0];
                const tags = res[1];
                usernotes.notes = material.annotations;
                tags.items = material.categories;

                return Promise.all([
                    userDb.insert(usernotes),
                    //create tags doc if tags are present
                    material.categories.length > 0 ? userDb.insert(tags) : Promise.resolve()
                ]);
            });
    };

    //outdated. calculated based on activity
    self.userStatistics = (info)=>{
        const userDb = nano.use(names.user(info.userId));

        return userDb.get('stats')
            .then((res)=>{
                res.books = {
                    inProgress: info.booksInProgressCount,
                    completed: info.completedBooksCount
                };

                res.flashcards = {
                    pending: info.pendingQuizzesCount,
                    mastered: info.masteredFlashcardsCount
                };

                res.quizzes = {
                    pending: info.pendingQuizzesCount,
                    completed: info.completedQuizzesCount
                };

                res.totalReadingTime = info.totalReadingTime;
                res.vocabularyTermsCount = info.vocabularyTermsCount;

                return userDb.insert(res);
            });
    };

    //not in use
    self.settings = (settings)=>{
        const userDb = nano.use(names.user_rw(settings.userId));

        return userDb.get('settings')
            .then((res)=>{
                const group = res[settings.group] || {};
                group[settings.name] = {
                    value: settings.value,
                    setAt: settings.setAt,
                    version: settings.version
                };

                res[settings.group] = group;

                return userDb.insert(res);
            });
    };

    //not in use
    self.flashcards = (flashcard)=>{
        const userDb = nano.use(names.user_rw(flashcard.userId));

        return userDb.get('flashcards')
            .then((res)=>{
                const card = res.values.filter((card)=>card._id === flashcard._id)[0] || {};
                const idx = res.values.indexOf(card);

                card._id = flashcard._id;
                card.mastered = flashcard.mastered;
                card.correctAnswersCount = flashcard.correctAnswersCount;
                card.createdAt = flashcard.createdAt;
                card.nextRunAt = flashcard.nextRunAt;
                card.termName = flashcard.termName;
                card.partOfSpeech = flashcard.partOfSpeech;
                card.dictionaryId = flashcard.dictionaryId;
                card.lastRunAt = flashcard.lastRunAt;

                if (idx === -1) {
                    res.values.push(card);
                }

                return userDb.insert(res);
            });
    };

}

module.exports = User;
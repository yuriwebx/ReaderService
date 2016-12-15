/*jslint node: true */
/*jslint camelcase: false */
/*jshint unused: vars*/
(function () {
   'use strict';
   var config = require(__dirname + '/../utils/configReader.js');
   var utils   = require('../utils/utils.js');
   var q       = require('q');
   var _       = require('underscore');
   var db      = require('./dao/utils').findDB();
   var userpublication  = require('./userpublications.js');
   var studyCourses     = require('./studyCourses.js');
   var manageTests      = require('./manageTests.js');
   var statistics       = require('./userstudystatistics.js');
   var nodeUuid         = require('node-uuid');
   var TEST_MODE = false;

   var DBtype = 'UserStudy';
   var sectionItemType = 'section item';
   var vocabularyAssessmentItemType = 'vocabulary assessment item';

   var deferredDbGet = function(id) {
      var deferred = q.defer();
      db.get(id, function(err, body) {
         if (err) {
            deferred.reject(utils.addSeverityResponse(err.description, config.businessFunctionStatus.error));
         }
         else {
            deferred.resolve(body);
         }
      });
      return deferred.promise;
   };

   var deferredDbInsert = function(insObject) {
      var deferred = q.defer();
      db.insert(insObject, function(err, body) {
         if (err) {
            deferred.reject(utils.addSeverityResponse(err.description + ' in user study progress.', config.businessFunctionStatus.error));
         }
         else {
            deferred.resolve(body.id);
         }
      });
      return deferred.promise;
   };

   var deferredDbView = function(viewName, queryParams) {
      var deferred = q.defer();
      db.view('Views', viewName,  queryParams, function(err, body) {
         if (err) {
            deferred.reject(utils.addSeverityResponse(err.description, config.businessFunctionStatus.error));
         }
         else {
            deferred.resolve(body.rows);
         }
      });
      return deferred.promise;
   };

   var returnValue = function(value) {
      return value;
   };

   var createErrorObj = function(err) {
      var errMsg = '';
      if (!_.has(err, 'statusMessages')) {
         errMsg = _.has(err, 'description') ? err.description : err;
         err = utils.addSeverityResponse(errMsg, config.businessFunctionStatus.error);
      }
      return err;
   };

   //helpers

   var getStudyItems = function(userStudy) {
      var deferred = q.defer();
      var studyItems = [];

      deferredDbGet(userStudy.publicationId)
      .then(function onPublicationGet(publication) {
         var _promise = null;
         if (publication.type !== 'StudyCourse') {
            var studyItem = new StudyItem({
               id             : nodeUuid.v1(),
               bookId         : publication._id,
               studyGuideId   : publication.studyGuideId
            });
            _promise = q([studyItem]);
         }
         else {
            _promise = studyCourses.getStudyCourse(userStudy.publicationId);
         }
         return _promise;
      })
      .then(function onGetItems(result) {
         var _promises = [];
         studyItems = result;

         if (!Array.isArray(result)) {
            studyItems = result.studyCourseItems;
         }
         _promises = studyItems
            .filter(function (item) {
               return item.type !== sectionItemType &&
                  item.type !== vocabularyAssessmentItemType;
            })
            .map(function (item) {
               return manageTests.getTestsList({
                  publicationId : item.studyGuideId || item.bookId
               }, userStudy.userId);
            });
         return q.all(_promises);
      })
      .then(function onGetTestLists(results) {
         _.each(results, function(tests, index) {
            if (tests.length) {
               studyItems[index].quizzes      = {};
               studyItems[index].flashcards   = {};
               _.each(tests, function(test) {
                  if (test.testType === 'Quiz') {
                     studyItems[index].quizzes[test._id] = {
                        _id      : test._id,
                        testType : test.testType,
                        locator  : test.locator,
                        status   : 'Not Started'
                     };
                  }
                  else {
                     studyItems[index].flashcards[test._id] = {
                        _id      : test._id,
                        testType : test.testType,
                        locator  : test.locator,
                        active   : false
                     };
                  }
               });
            }
         });
         deferred.resolve(studyItems);
      })
      .catch(deferred.reject);

      return deferred.promise;
   };

   function StudyItem(rawStudyItem) {
      this.id = rawStudyItem.id;
      this.completed = false;
      this.readingProgress = 0;
      this.firstOpenedAt = Date.now();
      this.lastOpenedAt = Date.now();
      this.bookId = rawStudyItem.bookId;
      if (rawStudyItem.studyGuideId) {
         this.studyGuideId = rawStudyItem.studyGuideId;
      }
      if (rawStudyItem.paragraphRange) {
         this.paragraphRange = rawStudyItem.paragraphRange;
      }
   }

   var createUserStudy = function(viewName, key, _userStudy) {
      var userStudy  = _userStudy;
      var _studyItems;

      return getStudyItems(userStudy)
      .then(function(studyItems) {
         _studyItems = studyItems;
         return deferredDbView(viewName, {key: key, include_docs : true});
      })
      .then(function onUserStudyView(userStudies) {
         if (userStudies.length) {
            userStudies[0].doc.studyItems = _.map(userStudies[0].doc.studyItems, function(userStudyItem, index){
               var _studyItem = _studyItems[index];
               _.defaults(userStudyItem, _studyItem);
               return userStudyItem;
            });
            throw userStudies[0].doc;
         }

         var errorMessage = 'Study course is empty';
         var firstValidStudyItemId = 0;
         userStudy.studyItems = _.map(_studyItems, function(studyItem) {
            if (studyItem.type !== 'Book') {
               return studyItem;
            }
            return new StudyItem(studyItem);
         });

         for ( var i = 0; i < _studyItems.length; i++ ) {
            if ( _studyItems[i].id ) {
               firstValidStudyItemId = _studyItems[i].id;
               break;
            }
         }
         if (firstValidStudyItemId) {
            userStudy.currentStudyItemId = firstValidStudyItemId;
         }
         else {
            throw utils.addSeverityResponse(errorMessage, config.businessFunctionStatus.error);
         }
         return deferredDbInsert(userStudy);
      })
      .then(function onPersist(userStudyId) {
         userStudy._id = userStudyId;
         userStudy.studyItems = _studyItems;
         return userStudy;
      })
      .catch(function onCatch(err) {
         if (err.type === 'UserStudy') {
            return err;
         }
         else {
            throw err;
         }
      });
   };

   var initiateClassStudy = function(classId, _userStudy){
      var deferred   = q.defer();
      var userStudy  = _userStudy;
      var viewName   = 'userStudiesStudyClass';
      var key;

      deferredDbGet(classId)
      .then(function (studyClass) {
         userStudy.publicationId = studyClass.publicationId;
         userStudy.classId       = classId;
         key                     = [userStudy.userId, classId];
         return createUserStudy(viewName, key, userStudy);
      })
      .then(deferred.resolve)
      .catch(deferred.reject);

      return deferred.promise;
   };

   var initiatePublicationStudy = function(publicationId, userStudy) {
      var viewName   = 'userStudiesPublication';
      var key        = [userStudy.userId, publicationId];

      return createUserStudy(viewName, key, userStudy).then(function onUserStudyDbInsert(userStudy) {
         // update underscore and use:  _.constant(userStudy);
         var _returnResult = function() {
            return userStudy;
         };
         return userpublication.updateUserPublication(userStudy.userId, {
            publicationId : userStudy.publicationId,
            userId        : userStudy.userId,
            currentStudyItemId : userStudy.currentStudyItemId
         })
         .then(_returnResult, _returnResult);
      });
   };

   //public

   function initiate(userId, mode, publicationId, classId) {
      var resultPromise = null;
      var rejectMessage = 'Mode ' + mode + ' of user study has not found.';
      var rejectReason  = {};
      var userStudy     = new UserStudy(userId, publicationId);

      if (mode === 'Publication') {
         resultPromise = initiatePublicationStudy(publicationId, userStudy);
      }
      else if (mode === 'Class' ) {
         resultPromise = initiateClassStudy(classId, userStudy);
      }
      else {
         rejectReason  = utils.addSeverityResponse(rejectMessage, config.businessFunctionStatus.error);
         resultPromise = q.reject(rejectReason);
      }

      return resultPromise;
   }

   function persistUserStudyProgress (userId, requestBody) {
      var studyId;
      var _now       = new Date().getTime();
      var completed  = requestBody.completed;
      var recordedAt = requestBody.recordedAt || _now;
      var publicationId       = requestBody.publicationId;
      var currentStudyItemId  = requestBody.currentStudyItemId;
      var readingPosition     = requestBody.readingPosition    || new ReadingPosition();
      var readingProgress     = requestBody.readingProgress    || 0;
      var readingDuration     = requestBody.readingDuration    || 0;
      var readingWordNumber   = requestBody.readingWordNumber  || 0;
      var type                = requestBody.type;
      var classId             = requestBody.classId;
      var viewName   = type === 'StudyClass' ? 'userStudiesStudyClass' : 'userStudiesPublication';
      var query      = type === 'StudyClass' ? [userId, classId] : [userId, publicationId];
      return deferredDbView(viewName, {
         key : query,
         include_docs : true
      })
      .then(function onUpdate(userStudies) {
         var userStudy = userStudies[0].doc;
         var currentStudyItem = _.findWhere(userStudy.studyItems, {id : userStudy.currentStudyItemId});
         var finishedItems = 0;

         currentStudyItem.lastOpenedAt    = _now;
         currentStudyItem.completed       = completed;
         currentStudyItem.readingProgress = readingProgress || currentStudyItem.readingProgress;
         currentStudyItem.readingPosition = readingPosition;

         finishedItems = _.filter(userStudy.studyItems, function(studyItem){
            return studyItem.completed;
         }).length;
         userStudy.completed    = finishedItems === userStudy.studyItems.length;
         userStudy.lastTouchedAt       = recordedAt;
         userStudy.currentStudyItemId  = currentStudyItemId;
         userStudy.readingWordNumber   = parseInt(userStudy.readingWordNumber, 10) || 0; //clean old invalid data ?
         userStudy.readingDuration     = readingDuration;
         userStudy.readingWordNumber   = readingWordNumber;
         userStudy.readingProgress     = userStudy.studyItems
            .filter(function(item) {
               return !item.type || item.type === 'Book'; //single item has no type
            })
            .reduce(function(total, item, i, arr) {
               total += (item.readingProgress || 0);
               return i + 1 < arr.length ? total : Math.ceil(total / (i + 1));
            }, 0);

         return db.insert(userStudy);
      })
      .then(function onGetStatistics(userStudy) {
         studyId = userStudy.id;
         return deferredDbView('userStudyCollectStats', {key : userId});
      })
      .then(function onUpdateStatistics(response) {
         if (response.length) {
            return statistics.updateUserStatistics(userId, response[0].value);
         }
         else {
            return null;
         }
      })
      .then(function onPersist() {
         var viewName = 'userStudiesProgress';
         var queryParams = {key: studyId, include_docs : true};
         return deferredDbView(viewName, queryParams);
      })
      .then(function getUserStudiesProgress(userStudiesProgress) {
         var startDay   = new Date();
         var endDay     = new Date();
         var totalReadingDuration = 0;
         var todayProgress, dayBeforeStart;

         if (type !== 'StudyClass') {
            return null;
         }
         if (TEST_MODE) {
            endDay = endDay.setMinutes(startDay.getMinutes() + 1);
            dayBeforeStart = startDay.setMinutes(startDay.getMinutes() - 1);
         }
         else {
            startDay = startDay.setHours(0,0,0,0);
            endDay   = endDay.setHours(23,59,59,999);
            dayBeforeStart = new Date(startDay).setDate(new Date(startDay).getDate() - 1);
         }
         todayProgress = _.filter(userStudiesProgress, function(progress) {
            return progress.doc.date > startDay && progress.doc.date < endDay;
         });
         var dayBefore = _.sortBy(userStudiesProgress, function (item){
            return item.date;
         })[1] || false;
         if (dayBefore) {
            totalReadingDuration = dayBefore.doc.totalReadingDuration;
         }

         if (todayProgress.length === 0) { //create new user studies progress
            todayProgress = {
               studyId              : studyId,
               date                 : _now,
               startedAt            : _now,
               finishedAt           : _now,
               totalReadingDuration : totalReadingDuration + readingDuration,
               readingDuration      : readingDuration,
               readingWordNumber    : readingWordNumber,
               writtenWordNumber    : 0, // TODO: set the real value
               type                 : 'UserStudyProgress'
            };
         }
         else if (todayProgress.length === 1) { //update today user studies progress
            todayProgress = todayProgress[0].doc;
            todayProgress.date = _now;
            todayProgress.finishedAt = _now;
            todayProgress.totalReadingDuration += readingDuration;
            todayProgress.readingDuration += readingDuration;
            if (todayProgress.readingWordNumber < readingWordNumber) {
               todayProgress.readingWordNumber = readingWordNumber;
            }
            todayProgress.writtenWordNumber = 0; // TODO: set the real value
         }
         else {
            throw utils.addSeverityResponse('User studies progress has found more than one in one day.',
               config.businessFunctionStatus.error);
         }
         return deferredDbInsert(todayProgress);
      })
      .then(function() {
         return studyId;
      })
      .catch(function(err) {
         throw err;
      });
   }

   function persistTest (userId, requestBody) {
      var quizProps        = ['correctAnswersCount', 'totalAnswersCount', 'locator'];
      var flashcardProps   = ['active', 'locator', 'testType'];
      var testType         = requestBody.type === 'quiz' ? 'quizzes' : 'flashcards';
      return persistMaterial(requestBody, testType, requestBody.id, function _transform (test) {
         if (testType === 'quizzes') {
            _.extend(test, _.pick(requestBody, quizProps), {
               executionDuration : 0,
               executedAt        : Date.now()
            });
            test.status = test.correctAnswersCount === test.totalAnswersCount ? 'Completed' : 'Partial';
         }
         else {
            _.extend(test, _.pick(requestBody, flashcardProps));
         }
      });
   }

   function persistEssay (userId, requestBody) {
      var essayId = requestBody.essayId;
      return deferredDbGet(essayId).then(function _onGetEssayTask(essayTask) {
         return persistMaterial(requestBody, 'essays', essayId, function _transform (essay) {
            var essayWordsLimit  = essayTask.wordsLimit;
            var paragraphId      = essayTask.locator.paragraphId;
            var wordsNumber      = _getWordsNumber(requestBody.text);
            _.extend(essay, {
               text              : requestBody.text,
               paragraphId       : paragraphId,
               wordsNumber       : wordsNumber,
               completed         : wordsNumber >= essayWordsLimit
            });
            if (essay.completed) {
               essay.completedAt = Date.now();
            }
         });
      });
   }

   function persistParagraphSummary (userId, requestBody) {
      var paragraphId = requestBody.locator.paragraphId;
      return persistMaterial(requestBody, 'paragraphSummaries', paragraphId, function _transform (paragraphSummary) {
         var wordsNumber = _getWordsNumber(requestBody.text);
         if (_.has(paragraphSummary, '_id')) {
            delete paragraphSummary._id;
            paragraphSummary.locator = {
               type           : "B",
               paragraphId    : paragraphId,
               index          : 1
            };
         }
         _.extend(paragraphSummary, {
            text              : requestBody.text,
            wordsNumber       : wordsNumber,
            completedAt       : Date.now()
         });
         if (paragraphSummary.wordsNumber) { // completedCondition ?
            paragraphSummary.completed = Date.now();
         }
      });
   }

   function persistMaterial (requestBody, materialType, materialId, transform) {
      return deferredDbGet(requestBody.studyId)
         .then(function _onGetUserStudy (userStudy) {
            var currentStudyItem = _findCurrentItem(userStudy.studyItems, requestBody.studyItemId);
            var material = _getUserMaterial(currentStudyItem, materialType, materialId);
            transform(material);
            return deferredDbInsert(userStudy);
         })
         .then(returnValue)
         .catch(createErrorObj);
   }


   function getStudents(classId){
      var deferred = q.defer();
      var classParticipants = {
            students: {},
            teachers: {}
         };
      var dbQueryParams = {include_docs : true, startkey : [classId, 1], endkey : [classId, 2, {}]};
      db.view('Views','studyclassById', dbQueryParams, function(err, participants){
         var reason = {};
         if(err){
            reason = utils.addSeverityResponse(err.description + ' in use study getStudents.', config.businessFunctionStatus.error);
            deferred.reject(reason);
         }
         else if(participants.rows.length !== 0){
            var statusAccepted = config.studyProjectConfig.membershipStatus.accepted;
            _.each(participants.rows, function(participant){
               if(participant.doc.studentConfirmationStatus === statusAccepted && participant.doc.teacherConfirmationStatus === statusAccepted){
                  classParticipants.students[participant.doc.studentId] = participant.doc;
               }
               if(participant.doc.type === 'ClassTeacher'){
                  classParticipants.teachers[participant.doc.teacherId] = participant.doc;
               }
            });
            deferred.resolve(classParticipants);
         }
         else{
            deferred.resolve(classParticipants);
         }
      });
      return deferred.promise;
   }

   function searchUserStudy(uid, classId, filter, category, interval, itemsCount){
      var deferred   = q.defer();
      var viewName = 'userStudiesSearch',
          queryParams = {key: classId, include_docs : true},
          users = {},
          userStudyProgress = {
            usersProgress: [],
            middleParams : {
               readingWord          : 0,
               readingDuration      : 0,
               totalReadingDuration : 0
            }
          };
      filter = filter.toLowerCase();
      q.all([getStudents(classId), deferredDbView(viewName, queryParams), deferredDbView('studyclassPublicationByClassId',{keys: [classId], include_docs : true})])
      .then(function(response){
         var classParticipants = response[0];
         var activeStudent = classParticipants.students,
             teachers      = classParticipants.teachers,
             userProfiles  = response[1],
             studyClass    = response[2],
             studentView   = {},
             classType     = studyClass[0].value.classType;

         studentView[uid] = activeStudent[uid];
         var userStudyView = teachers[uid] ?
                              (classType === 'Independent Study' ? teachers : activeStudent) :
                              (activeStudent[uid] ? studentView : {});

         var readingWord              = studyClass[0].value.expectedDailyWork / 60000;
         var expectedTotalReadingTime = new Date(new Date() - studyClass[0].value.scheduledAt).getDate() * studyClass[0].value.expectedDailyWork;
         userStudyProgress.middleParams = {
            readingDuration          : studyClass[0].value.expectedDailyWork,
            readingWord              : readingWord * 140,
            expectedTotalReadingTime : expectedTotalReadingTime
         };

          _.each(userProfiles, function(userProfile){
            if(userStudyView[userProfile.doc._id]){
               users[userProfile.value.studyId] = {
                  userId      : userProfile.doc._id,
                  email       : userProfile.doc.email,
                  firstName   : userProfile.doc.firstName,
                  lastName    : userProfile.doc.lastName,
                  progress    : []
               };

               if ( userProfile.doc.photo ) {
                  users[userProfile.value.studyId].photo = userProfile.doc.photo;
               }
            }
         });
          //TODO: check session active or not
         var userStudyIds = _.map(userProfiles, function(userStudy){
            return userStudy.value.studyId;
         });
         var viewName = 'userStudiesProgress',
             queryParams = {keys: userStudyIds, include_docs : true};
         return  deferredDbView(viewName, queryParams);
      })
      .then(function (userStudiesProgress){
         var startDay   = new Date();
         startDay = startDay.setHours(0,0,0,0);
         _.each(userStudiesProgress, function(progress){
            delete progress.doc._id;
            delete progress.doc._rev;
            delete progress.doc.type;
            if(users[progress.doc.studyId] && users[progress.doc.studyId].progress){
               users[progress.doc.studyId].progress.push(progress.doc);
            }
         });
         users = _.values(users);
         users = _.filter(users, function(user){
            return user.firstName.toLowerCase().indexOf(filter) === 0 || user.lastName.toLowerCase().indexOf(filter) === 0;
         });
         _.each(users, function(user){
            user.progress.sort(function(a,b){
               return a.date < b.date;
            });
            if (!TEST_MODE) {
               user.progress = _.filter(user.progress, function(progress){
                  return progress.date < startDay;
               });
            }
            // user.progress.shift();
            if(user.progress.length < interval){
               while(user.progress.length < interval){
                  user.progress.unshift({});
               }
            }
            user.progress = user.progress.slice(0, interval).reverse();
         });
         users = users.slice(0, itemsCount);

         //TODO: need used all category
         userStudyProgress.usersProgress = users;

         if(category === 'All students'){
            deferred.resolve(userStudyProgress);
         }
         else{
            deferred.resolve(userStudyProgress);
         }
      })
      .catch(deferred.reject);
      return deferred.promise;
   }

   var normalizeDates = function(userDataArray, _userStudyMap) {
      var oneDay = 1000 * 60 * 60 * 24;
      var now = new Date().getTime();
      var userProgress = [];
      _.each(userDataArray, function(user) {
         user.progress = _.sortBy(user.progress, 'date').reverse();
         _.each(user.progress, function(progress, index) {
            var setDate = now - (oneDay * (index + 1));
            progress.date = setDate;
            progress = _.extend(progress, {
               studyId: _userStudyMap[user.userId],
               startedAt: setDate,
               finishedAt: setDate,
               writtenWordNumber: 0,
               type: "UserStudyProgress"
            });
            userProgress.push(progress);
         });
      });
      return userProgress;
   };

   function setUserStudyProgressClass(userId, classId, userDataArray) {
      var deferred = q.defer();
      var viewName = 'userStudiesSearch',
         queryParams = {
            key: classId,
            include_docs: true
         },
         _userStudyMap = {},
         _newProgress = [];

      deferredDbView(viewName, queryParams).then(function(userStudies) {
            //TODO: check session active or not
            var userStudyIds = _.map(userStudies, function(userStudy) {
               return userStudy.value.studyId;
            });
            _.each(userStudies, function(userStudy) {
               _userStudyMap[userStudy.value._id] = userStudy.value.studyId;
            });
            _newProgress = normalizeDates(userDataArray, _userStudyMap);
            var viewName = 'userStudiesProgress',
               queryParams = {
                  keys: userStudyIds,
                  include_docs: true
               };
            return deferredDbView(viewName, queryParams);
         })
         .then(function(userStudiesProgress) {
            userStudiesProgress = _.map(userStudiesProgress, function(progress) {
               progress.doc._deleted = true;
               return progress.doc;
            });
            _newProgress = _newProgress.concat(userStudiesProgress);
            db.bulk({
               docs: _newProgress
            }, function(err, body) {
               if (err) {
                  deferred.reject(utils.addSeverityResponse(err.description + ' in BF setUserStudyProgressClass.', config.businessFunctionStatus.error));
               }
               else {
                  deferred.resolve({
                     status: config.businessFunctionStatus.ok
                  });
               }
            });
         });
      return deferred.promise;
   }

   //
   function _findCurrentItem(studyItems, currentItemId) {
      var currentItem = _.find(studyItems, function (item) {
         return _.has(item, 'id') && item.id === currentItemId;
      });
      if (!currentItem) {
         throw 'Cannot find a valid study item';
      }
      return currentItem;
   }

   function _getUserMaterial(studyItem, materialType, materialId) {
      if (!_.has(studyItem, materialType)) {
         studyItem[materialType] = {};
      }
      if (!_.has(studyItem[materialType], materialId)) {
         studyItem[materialType][materialId] = {
            _id : materialId,
            startedAt : Date.now()
         };
      }
      return studyItem[materialType][materialId];
   }

   function _getWordsNumber(text) {
      var textMatch = text.match(/\S+/g);
      return textMatch ? textMatch.length : 0;
   }

   function UserStudy(userId, publicationId) {
      var _now = Date.now();
      this.userId             = userId;
      this.type               = DBtype;
      this.publicationId      = publicationId;
      this.firstOpenedAt      = _now;
      this.lastTouchedAt      = _now;
      this.completed          = false;
      this.readingDuration    = 0;
      this.readingProgress    = 0;
      this.readingWordNumber  = 0;
      this.currentStudyItemId = '';
      this.studyItems         = [];
   }

   function Activity(userId, params) {
      var _now = Date.now();
      this.userId = userId;
      this.studyId = params.studyId || '';
      this.wordsCount = parseInt(params.progressData.wordsCount || 0, 10);

      ['from', 'to', 'paragraphLocator'].forEach(function(property){
         if(params.progressData.hasOwnProperty(property)){
            this[property] = params.progressData[property];
         }
      }, this);
      this.createdAt = _now;
      this.type = 'Activity';
      this.progressType = params.progressType;
   }

   function ReadingPosition () {
      this.fragmentId = '';
   }

   function persistReadingProgressTracking(userId, requestBody) {
      var activity = new Activity(userId, requestBody);
      return deferredDbInsert(activity);
   }

   module.exports = {
      initiate                   : initiate,
      persistProgress            : persistUserStudyProgress,
      searchUserStudy            : searchUserStudy,
      persistTest                : persistTest,
      persistEssay               : persistEssay,
      persistParagraphSummary    : persistParagraphSummary,
      setUserStudyProgressClass  : setUserStudyProgressClass,
      persistReadingProgressTracking: persistReadingProgressTracking
   };
})();
 /*jslint node: true */
 /*jslint camelcase: false */
 (function() {
   'use strict';
   var q = require('q');
   var _ = require('underscore');

   var db = require('./../rest/dao/utils').findDB();
   var config = require(__dirname + '/../utils/configReader.js');
   var logger = require('../utils/logger.js').getLogger(__filename);

   var deferredDbInsert = q.nbind(db.insert, db);
   var deferredDbView = q.nbind(db.view, db, 'Views');
   var deferredBulkInsert = q.nbind(db.bulk, db);
   var deferredFetch = q.nbind(db.fetch, db);

   function generateUserStudy(userStudy, studyClass, numberDays) {
     var viewName = 'userStudiesProgress';
     var queryParams = {
       key: userStudy._id,
       include_docs: true
     };
     var _userProgress = [];
     var _totalReadingDuration = 0;
     var _totalReadWordNumber = 0;
     var _readingProgress = 0;

     return deferredDbView(viewName, queryParams)
       .then(function(response) {
         var userProgress = response[0].rows;
         var minute = 60000;
         var numberWordsPreMinute = 140;
         var readingDurationRandomRange = 700000;
         var readingWordRandomRange = (readingDurationRandomRange / minute) * numberWordsPreMinute;

         var startDay = new Date();
         var endDay = new Date();

         var readingWord = studyClass.expectedDailyWork / minute;
         var middleParams = {
           readingDuration: studyClass.expectedDailyWork,
           readingWord: readingWord * numberWordsPreMinute
         };

         startDay = startDay.setHours(0, 0, 0, 0);
         endDay = endDay.setHours(23, 59, 59, 999);

         _userProgress = userProgress || [];
         _userProgress = _.map(userProgress, function(item) {
           return item.doc;
         });
         _userProgress = _.sortBy(_userProgress, function(item) {
           return item.date;
         }).reverse();

         _totalReadingDuration = _userProgress.length !== 0 ? _userProgress[0].totalReadingDuration : 0;
         _totalReadWordNumber = userStudy.readingWordNumber;

         _userProgress = Array.apply(null, new Array(numberDays)).map(function(progress, index) {
           var day = numberDays - index - 1;

           var dayBeforeStart = new Date(startDay).setDate(new Date(startDay).getDate() - day);
           var dayBeforeEnd = new Date(endDay).setDate(new Date(endDay).getDate() - day);

           var readingDuration = middleParams.readingDuration + Math.round(Math.round(readingDurationRandomRange * Math.random()) / minute) * minute - readingDurationRandomRange / 2;
           var readingWordNumber = Math.round(middleParams.readingWord + readingWordRandomRange * Math.random() - readingWordRandomRange / 2);
           var writtenWordNumber = Math.round(1000 * Math.random());

           _totalReadingDuration += readingDuration;
           _totalReadWordNumber += readingWordNumber;

           progress = {
             studyId: userStudy._id,
             date: dayBeforeEnd,
             startedAt: dayBeforeStart,
             finishedAt: dayBeforeEnd,
             totalReadingDuration: _totalReadingDuration,
             readingDuration: readingDuration,
             readingWordNumber: readingWordNumber,
             writtenWordNumber: writtenWordNumber,
             type: 'UserStudyProgress'
           };
           return progress;
         });
         return deferredBulkInsert({
           docs: _userProgress
         });
       })
       .then(function() {
         var publicationIds = _.pluck(userStudy.studyItems, 'id');
         var queryParams = {
           keys: publicationIds,
           include_docs: true
         };
         return deferredFetch(queryParams);
       })
       .then(function(response) {
         var publications = response[0].rows;
         publications = _.map(publications, function(publication) {
           return publication.doc;
         });
         var readingTimes = _.pluck(publications, 'readingTime');
         var totalReadingTime = _.reduce(readingTimes, function(memo, num) {
           return memo + num;
         }, 0);
         _readingProgress = Math.round(100 * _totalReadingDuration / totalReadingTime);
         var queryParams = {
           keys: [userStudy._id],
           include_docs: true
         };
         return deferredFetch(queryParams);
       })
       .then(function(response) {
         userStudy = response[0].rows;
         userStudy = _.extend(userStudy[0].doc, {
           readingDuration: _totalReadingDuration,
           readingProgress: _readingProgress,
           readingWordNumber: _totalReadWordNumber,
         });
         return deferredDbInsert(userStudy);
       });
   }

   var _update = function(userStudys, studyClasses, numberDays) {
     var _studyClass = {};
     _.each(studyClasses, function(studyClass) {
       _studyClass[studyClass._id] = studyClass;
     });
     var userProgresses = _.map(userStudys, function(userStudy) {
       var studyClass = _studyClass[userStudy.doc.classId];
       if (studyClass) {
         return generateUserStudy(userStudy.doc, studyClass, numberDays);
       }
     });
     return userProgresses;
   };

   function updateProgress() {
     var emailsForTest = config.studyProjectConfig.userEmailsForTestProgress; //['editor@irls'];
     var viewName = 'usersByEmail';
     var queryParams = {
       keys: emailsForTest,
       include_docs: true
     };
     var _userStudies = [];
     var _studyClasses = [];
     return deferredDbView(viewName, queryParams)
       .then(function(response) {
         var users = response[0].rows;
         var userIds = users.filter(function(user) {
             return user.doc;
           })
           .map(function(user) {
             return user.doc._id;
           });

         var viewName = 'studyclassTeachersAndStudentsById';
         var queryParams = {
           keys: userIds,
           include_docs: true
         };
         return deferredDbView(viewName, queryParams);
       })
       .then(function(response) {
         var students = response[0].rows;
         var userStudyKeys = students.filter(function(student) {
             return student.doc;
           })
           .map(function(student) {
             return [student.doc.studentId, student.doc.classId];
           });

         var viewName = 'userStudiesStudyClass';
         var queryParams = {
           keys: userStudyKeys,
           include_docs: true
         };
         return deferredDbView(viewName, queryParams);
       })
       .then(function(response) {
         _userStudies = response[0].rows;
         var classIds = _userStudies.filter(function(userStudy) {
             return userStudy && userStudy.doc;
           })
           .map(function(userStudy) {
             return userStudy.doc.classId;
           });

         var queryParams = {
           keys: classIds,
           include_docs: true
         };
         return deferredFetch(queryParams);
       })
       .then(function(response) {
         _studyClasses = response[0].rows;
         _studyClasses = _studyClasses.filter(function(studyClass) {
             return studyClass.doc;
           })
           .map(function(studyClass) {
             return studyClass.doc;
           });

         if (_userStudies.length !== 0 && _studyClasses.length !== 0) {
           return q.all(_update(_userStudies, _studyClasses, 1));
         }
       })
       .then(function() {
         logger.log('Robot statistic updated.');
       }).catch(function(failReason) {
         logger.error(failReason);
       });
   }

   var params = process.argv.slice(2);
   if (params && params[0] === 'update') {
     updateProgress();
   }

   module.exports = {
     generateUserStudy: generateUserStudy,
     updateProgress: updateProgress
   };

 })();
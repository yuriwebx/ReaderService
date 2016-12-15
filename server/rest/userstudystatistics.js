/*jslint node: true */
/*jslint camelcase: false */
/*jshint unused: vars*/
(function () {
   "use strict";
   var utils   = require('../utils/utils.js');
   var config  = require(__dirname + '/../utils/configReader.js');
   var q       = require('q');
   var _       = require('underscore');
   var db      = require('./dao/utils').findDB();

   var emptyStatistics =
   {
      booksInProgressCount    : 0,
      completedBooksCount     : 0,
      vocabularyTermsCount    : 0,
      totalReadingTime        : 0,
      completedQuizzesCount   : 0,
      pendingQuizzesCount     : 0,
      masteredFlashcardsCount : 0,
      pendingFlashcardsCount  : 0
   };

   function handleError(err) {
      throw utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
   }

   var getUserStatistics = function (userId) {
      return q.ninvoke(db,
         'view',
         'Views',
         'userstudystatisticsByUid',
         {
            key : userId,
            include_docs : true
         })
      .then(function onStatsGet(response) {
         var result = emptyStatistics;
         var body = response[0];
         if (body && body.rows && body.rows.length) {
            result = body.rows[0].doc;
         }
         return result;
      })
      .catch(handleError);
   };

   var updateUserStatistics = function(userId, stats) {
      return getUserStatistics(userId)
         .then(function onStatsGet(body) {
            body = _.extend(body, stats);
            body.userId = userId;
            body.type = 'UserStudyStatistics';
            return db.insert(body);
         })
         .then(function onInsertNewStats() {
            return {};
         })
         .catch(handleError);
   };

   module.exports = {
      getUserStatisticsByUid  : getUserStatistics,
      updateUserStatistics    : updateUserStatistics
   };

})();
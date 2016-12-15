(function() {
   'use strict';

   var config = require('../../utils/configReader.js');
   var q = require('q');
   var db = require('./utils').findDB();
   var utils = require('../../utils/utils.js');
   var functionMod = config.handlerRejectMode.callFnction;

   function findByConfirmationHashCode(hashCode) {
      var deferred = q.defer();
      db.view('Views','emailtaskByConfirmationHashCode', {key: hashCode, include_docs: true}, function(err, tasks) {
         if (err) {
            deferred.reject(utils.addSeverityResponse(err.description, config.businessFunctionStatus.error));
         }
         else if (tasks.rows.length === 0) {
            deferred.reject(utils.addSeverityResponse('Task hashcode ' + hashCode + ' was not found.', config.businessFunctionStatus.error));
         }
         else {
            deferred.resolve(tasks.rows[0].doc);
         }
      });
      return deferred.promise;
   }

   function updateStatus(task){
      var defer = q.defer();
      db.insert(task, function(err) {
         if (err) {
            defer.reject(utils.addSeverityResponse('Session not active', config.businessFunctionStatus.error));
         }
         else {
           defer.resolve({});
         }
      });
      return defer.promise;
   }

   module.exports = {
      findByConfirmationHashCode : findByConfirmationHashCode,
      updateStatus               : updateStatus
   };
})();

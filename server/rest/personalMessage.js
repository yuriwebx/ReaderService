/*jslint node: true */
/*jslint camelcase: false */
/*jshint unused: vars*/
(function () {
'use strict';
var errorMessages = {
   messagesNotFound: 'Personal messages has not found.'
};
var config = require(__dirname + '/../utils/configReader.js');
var q = require('q');
var _ = require('underscore');

var utils = require('../utils/utils.js');

var db       = require('./dao/utils').findDB();
var DBtype = 'PersonalMessage';

var dbResult = function(deferred, callback){
   return function(err, body){
      var response;
      if(!err){
         response = typeof callback === 'function' ? callback(body) : body;
         deferred.resolve(response);
      }
      else{
         response = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
         deferred.reject(response);
      }
   };
};

var bulkInsert = function(arrayOfObjects){
   var deferred = q.defer();
   db.bulk({
      docs: arrayOfObjects
   }, dbResult(deferred, function() {
      return {status: config.businessFunctionStatus.ok};
   }));
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

   function searchPersonalMessage(uid, reviewed) {
      var dbQueryParams = {
             include_docs: true,
             keys: [uid]
          },
          personalMessages = [];

      return deferredDbView('searchPersonalMessages', dbQueryParams)
          .then(function (messages) {
             if (reviewed !== undefined) {
                reviewed = JSON.parse(reviewed);
                messages = _.filter(messages, function (message) {
                   return message.doc.reviewed === reviewed;
                });
             }

             personalMessages = _.map(messages, function (message) {
                delete message.doc._rev;
                return message.doc;
             });

             var keys = [],
                 _dbQueryParams = {
                    include_docs: true,
                    keys: keys
                 };

             _.each(personalMessages, function (message) {
                if (message.classId) {
                   keys.push([message.classId, 2, message.toUserId], [message.classId, 0, message.classId]);
                }
             });
             return deferredDbView('studyclassById', _dbQueryParams);
          }).then(function (response) {
             var statusesByClassIds = {},
                 classStatusesMap = {};

             _.each(response, function (item) {
                if ( item.doc.type === 'StudyClass' ) {
                   classStatusesMap[item.doc.classId] = {
                      studyClassStatus : item.doc.studyClassStatus
                   };
                }
                else {
                   statusesByClassIds[item.doc.classId] = {
                      studentConfirmationStatus : item.doc.studentConfirmationStatus,
                      teacherStatus : item.doc.teacherConfirmationStatus
                   };
                }
             });

             return _.map(personalMessages, function (message) {
                var _statusByClassId = _.extend(statusesByClassIds[message.classId], classStatusesMap[message.classId]) || {};
                return message.classId ? _.extend(message, _statusByClassId) : message;
             });
          });
   }

function persistPersonalMessage(uid, recipientIds, text, subject, extendMessageParams){
   var data = new Date().getTime();
   var personalMessages = [];
   _.each(recipientIds, function (recipientId) {
      if ( uid !== recipientId ) {
         var message = {
            registeredAt: data,
            fromUserId: uid,
            toUserId: recipientId,
            text: text,
            subject: subject,
            reviewed: false,
            type: DBtype
         };

         if (_.isObject(extendMessageParams)) {
            message = _.extend(message, extendMessageParams); //invite
         }
         personalMessages.push(message);
      }
   });
   return bulkInsert(personalMessages);
}

function updatePersonalMessageState(uid, messageIds, reviewed){
   var deferred = q.defer();
   var dbQueryParams = {
      include_docs : true
   };
   dbQueryParams.keys = _.map(messageIds, function(messageId){
      return [uid, messageId];
   });

   db.view('Views', 'personalMessagesToUser', dbQueryParams, function(err, personalMessages) {
      var messages = personalMessages.rows, response = {};
      if (err) {
         response = utils.addSeverityResponse(err.description, config.businessFunctionStatus.error);
         deferred.reject(response);
      }
      else if (messages.length !== 0) {
         messages = _.map(messages, function(message){
            message.doc.reviewed = reviewed;
            return message.doc;
         });
         bulkInsert(messages).then(function(response){
            deferred.resolve(response);
         },deferred.reject);
      }
      else {
         response = utils.addSeverityResponse(errorMessages.messagesNotFound, config.businessFunctionStatus.error);
         return response;
      }
   });
   return deferred.promise;
}

module.exports = {
   search: searchPersonalMessage,
   persist: persistPersonalMessage,
   updatestate: updatePersonalMessageState
};
})();
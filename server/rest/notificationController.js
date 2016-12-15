/*jslint node: true */
'use strict';
var _ = require('underscore');
var q = require('q');

var flashcards = require('./studyFlashcards.js');
var discussion = require('./discussion');
var personalMessage = require('./personalMessage');
var applicationSession = require('./bl/applicationSessions');

module.exports = {
   //GET : {},
   POST: {
      usernotification: function (req, res) {
         var runId = req.headers['x-run-id'] || '';
         var notifications = _.pairs(req.body);

         var callFlashCard = function () {
            return flashcards.searchStudies(runId);
         };
         var callPersonalMessage = function (params) {
            return personalMessage.search(params.userId);
         };
         var callDiscussionMessage = function (params) {
            return discussion.searchClassDiscussions(params.classId, params.bookId, params.userId);
         };
         var callUserClassDiscussions = function (params) {
            return discussion.searchUserClassDiscussions(params.userId, params.itemsCount);
         };
         var callActivityMonitor = function (params) {
            var online     = params.online;
            var activities = params.activities || [];

            return applicationSession.updateUserActivity(runId, online, activities);
         };
         var searchUsersWithActivity = function (params) {
            var activity         = params.activity;
            var contextActivity  = params.contextActivity;
            var activeOnly       = params.activeOnly;

            return applicationSession.searchUsersWithActivity(activity, contextActivity, activeOnly);
         };
         var countUsersWithActivity = function (params) {
            var activity   = params.activity;
            var activeOnly = params.activeOnly;

            return applicationSession.countUsersWithActivity(activity, activeOnly);
         };
         var notificationMap = {
            flashcards              : callFlashCard,
            messages                : callPersonalMessage,
            activitymonitor         : callActivityMonitor,
            discussions             : callDiscussionMessage,
            userDiscussions         : callUserClassDiscussions,
            searchUsersWithActivity : searchUsersWithActivity,
            countUsersWithActivity  : countUsersWithActivity
         };

         return applicationSession.getUserId(runId)
            .then(function queryResults(userId) {
               return _query(userId);
            })
            .then(function sendResult(result) {
               res.send(result);
            })
            .catch(function onErr(err) {
               res.send({
                  messages: err.statusMessages
               });
            });

         /* */

         function _query(userId, options) {
            return _.isObject(options) && options.type === 'series' ? _series(userId) : _parallel(userId);
         }

         function _series(userId) {
            return _.reduce(notifications, function (promise, notification) {
               return promise
                  .spread(function querySeries(response, result) {
                     result.value.push(response);
                     return q.allSettled([_callHandler(notification, userId), result.value]);
                     });
                  }, q([null, { value: [] }]))
               .spread(function composeResult(response, result) {
                  result.value.push(response);
                  return _.map(result.value.slice(1), _prepareResult);
               });
         }

         function _parallel(userId) {
            return q.allSettled(_.map(notifications, function (notification) {
                  return _callHandler(notification, userId);
               }))
               .then(function composeResult(responses) {
                  return _.map(responses, _prepareResult);
               });
         }

         function _callHandler(notification, userId) {
            if (!_.has(notificationMap, notification[0])) {
               return q.reject({
                  statusMessages: 'There is no handler for this type'
               });
            }
            return notificationMap[notification[0]]
               .call(null, _.extend({
                  userId: userId
               }, notification[1] || {}));
         }

         function _prepareResult(response, index) {
            var result = {
               name: notifications[index][0]
            };
            if (response.state === 'fulfilled') {
               result.data = response.value;
            }
            else {
               result.error = response.reason.statusMessages;
            }
            return result;
         }
      }
   }
   /*,
    POST:{},
    DELETE: {},
    PUT:{}*/
};
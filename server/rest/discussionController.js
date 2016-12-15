/*jslint node: true */
'use strict';
var applicationSession = require('./bl/applicationSessions');
var discussions = require('./discussion');

function handleRequest (req, res, promise) {
   var runId = req.headers['x-run-id'] || '';

   applicationSession.getUserId(runId).then(function () {
      return promise;
   }).then(_sendResponse).catch(_sendResponse);

   function _sendResponse (response) {
      res.send(response);
   }
}

module.exports = {
   GET: {
      getClassDiscussion: function getClassDiscussion (req, res) {
         handleRequest(req, res, discussions.getClassDiscussion(req.query.classDiscussionId));
      },
      searchClassDiscussions: function searchClassDiscussions (req, res) {
         applicationSession.getUserId(req.headers['x-run-id'])
            .then(function (userId) {
               return discussions.searchClassDiscussions(req.query.classId, req.query.bookId, userId);
            })
            .then(_sendResponse)
            .catch(_sendResponse);

         function _sendResponse (response) {
            res.send(response);
         }
      },
      searchDiscussionMessages: function searchDiscussionMessages (req, res) {
         handleRequest(req, res, discussions.searchDiscussionMessages(req.query.classId, req.query.classDiscussionId));
      },
      searchUserClassDiscussions: function searchUserClassDiscussions (req, res) {
         applicationSession.getUserId(req.headers['x-run-id'])
            .then(function (userId) {
               return discussions.searchUserClassDiscussions(userId, req.query.itemsCount);
            })
            .then(_sendResponse)
            .catch(_sendResponse);

         function _sendResponse (response) {
            res.send(response);
         }
      }
   },
   POST: {
      updateUserDiscussionMessagesState: function updateUserDiscussionMessagesState (req, res) {
         applicationSession.getUserId(req.headers['x-run-id'])
            .then(function (userId) {
               req.body.userId = userId;
               return discussions.updateUserDiscussionMessagesState(
                   req.body.classDiscussions.map(function(d) {return d.classDiscussionId;}),
                   req.body.reviewed,
                   req.body.informed,
                   req.body.userId);
            })
            .then(_sendResponse)
            .catch(_sendResponse);

         function _sendResponse (response) {
            res.send(response);
         }
      },
      persistClassDiscussion: function persistClassDiscussion (req, res) {
         applicationSession.getUserId(req.headers['x-run-id'])
            .then(function (authorId) {
               req.body.authorId = authorId;
               return discussions.persistClassDiscussion(req.body);
            })
            .then(_sendResponse)
            .catch(_sendResponse);

         function _sendResponse (response) {
            res.send(response);
         }
      },
      setClassDiscussionState: function setClassDiscussionState (req, res) {
         handleRequest(req, res, discussions.setClassDiscussionState(req.body.classDiscussionId, req.body.frozen));
      },
      persistDiscussionMessage: function persistDiscussionMessage (req, res) {
         applicationSession.getUserId(req.headers['x-run-id'])
         .then(function (userId) {
            req.body.userId = userId;
            return discussions.persistDiscussionMessage(req.body);
         })
         .then(_sendResponse)
         .catch(_sendResponse);

         function _sendResponse (response) {
            res.send(response);
         }
      }
   },
   DELETE: {
      removeClassDiscussion: function remove (req, res) {
         handleRequest(req, res, discussions.removeClassDiscussion(req.query.classDiscussionId));
      }
   }
   /*
    PUT:{}*/
};
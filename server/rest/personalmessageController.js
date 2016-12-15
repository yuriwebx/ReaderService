/*jslint node: true */
/*jslint camelcase: false */
'use strict';
var applicationSession = require('./bl/applicationSessions');
var personalMessage = require('./personalMessage');

module.exports = {
   GET : {
      search: function(req, res) {
        var runId = req.headers['x-run-id'] || '',
            userId = req.param("userId"), //??
            reviewed = req.param("reviewed");

        applicationSession.getUserId(runId).then(_onSuccessFilter).fail(function(reason){
          res.send(reason);
        });

        function _onSuccessFilter(uid) {
          personalMessage.search(uid, reviewed, userId).then(function(response) {
            res.send(response);
          }, function(reason) {
            res.send(reason);
          });
        }
      }
   },
   POST : {
      persist: function(req, res) {
        var runId = req.headers['x-run-id'] || '',
          // userId = req.param("userId"), //??
          recipientIds = req.param("recipientIds"),
          text = req.param("text"),
          subject = req.param("subject");

        applicationSession.getUserId(runId).then(_onSuccessFilter).fail(function(reason){
          res.send(reason);
        });

        function _onSuccessFilter(uid) {
          personalMessage.persist(uid, recipientIds, text, subject).then(function(response){
             res.send(response);
          }, function(reason){
             res.send(reason);
          });
        }
      },
      updatestate: function(req, res) {
        var runId = req.headers['x-run-id'] || '',
            userId = req.param("userId"), //??
            messageIds = req.param("messageIds"),
            reviewed = req.param("reviewed");

        applicationSession.getUserId(runId).then(_onSuccessFilter).fail(function(reason){
          res.send(reason);
        });

        function _onSuccessFilter(uid) {
          personalMessage.updatestate(uid, messageIds, reviewed, userId).then(function(response) {
            res.send(response);
          }, function(reason) {
            res.send(reason);
          });
        }

      }
   }
   /*,
    POST:{},
    DELETE: {},
    PUT:{}*/
};
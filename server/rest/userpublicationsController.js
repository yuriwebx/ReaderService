/*jslint node: true */
/*jslint camelcase: false */
'use strict';
var userPublications = require('./userpublications.js');
var applicationSession = require('./bl/applicationSessions');

module.exports = {
   POST : {
      update : function (req, res) {
         var runId = req.headers['x-run-id'] || '';
         var userData = req.body.userPublication;
         var isEditor = req.body.isEditor;

         applicationSession.getUserId(runId)
         .then(function(userId) {
            userPublications.updateUserPublication(userId, userData, isEditor)
               .then(function (data) {
                  res.send(data);
               }, _onReject);
         }, _onReject);
         
         function _onReject(err) {
            res.send(err);
         }
      }
   },

   GET : {
      getRecentBooks : function (req, res) {
         var runId = req.headers['x-run-id'] || '';
         var isEditor = req.query.isEditor;
         function _onSuccess(userId) {
            var numberOfRecentBooks = 15;
            return userPublications.getRecentBooks(userId, numberOfRecentBooks, isEditor);
         }

         function _sendData(data) {
            res.send(data);
         }

         applicationSession.getUserId(runId)
         .then(_onSuccess).then(_sendData).catch(_sendData);

      }
   }
};
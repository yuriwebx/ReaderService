/*jslint node: true */
(function () {
   'use strict';
   var manageEssayTask = require('./manageEssayTask.js');
   var applicationSession = require('./bl/applicationSessions');

   function _process(req, res, callback) {
      var runId = req.headers['x-run-id'] || '';
      var params = [].slice.call(arguments, 3);

      applicationSession.getUserId(runId)
         .then(function _onGetUserId () { // userId
            return callback.apply(null, params);
         })
         .then(function _onSuccess (response) {
            res.send(response);
         })
         .catch(function _onError (err) {
            res.send(err);
         });
   }

   module.exports = {
      POST: {
         persistEssayTask: function (req, res) {
            _process(req, res, manageEssayTask.persistEssayTask, req.body);
         }
      },
      GET: {
         getEssayTask: function (req, res) {
            _process(req, res, manageEssayTask.getEssayTask, req.query.id);
         },
         removeEssayTask: function (req, res) {
            _process(req, res, manageEssayTask.removeEssayTask, req.query.id);
         },
         getEssayTasksList: function (req, res) {
            _process(req, res, manageEssayTask.getEssayTasksList, req.query);
         }
      }
   };
})();
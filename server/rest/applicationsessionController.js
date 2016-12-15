/*jslint node: true */
(function() {
   'use strict';

   var applicationSession  = require('./bl/applicationSessions'),
       parameters          = require('./bl/parameters'),
       q                   = require('q'),
       _                   = require('underscore');

   module.exports = {
      POST : function (req, res) {
         var sessionId = req.body.SID || '';
         var context = {
            clientNodeContext    : req.body.clientNodeContext || {},
            applicationContext   : req.body.applicationContext || {},
         };
         _.extend(context, req.body.ExecutionContext);

         var data = [
            applicationSession.registerApplicationSession(sessionId, null, context),
            parameters.fetch(context)
         ];

         q.all(data).then(function(results) {
            var data = results[0];
            data.parameters = results[1];
            res.send(data);
         }, function(data) {
            res.send(401, data);
         });
      },
      DELETE: function (req, res) {
         var runId = req.headers['x-run-id'] || '';
         applicationSession.terminateApplicationSession(runId).then(function(){
            res.send('OK');
         }, function(reason){
            res.send(reason);
         });
      }
   };
})();

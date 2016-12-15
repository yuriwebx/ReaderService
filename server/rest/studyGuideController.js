(function() {
   /*jslint node: true */
   'use strict';
   var studyGuide = require('./studyGuide.js');
   var applicationSession = require('./bl/applicationSessions');

   module.exports = {
      GET: {
         searchEditors: function (req, res) {
            var runId = req.headers['x-run-id'] || '';

            applicationSession.getUserId(runId)
                .then(function () {
                   return studyGuide.searchEditors(req.param("studyGuideId"), req.param("filter"), req.param("itemsCount"));
                })
                .then(function (editorsList) {
                   res.send(editorsList);
                })
                .catch(function (err) {
                   res.send(err);
                });
         }
      },
      POST: {
         persistEditorsStatus: function(req, res) {
            var runId = req.headers['x-run-id'] || '';
            applicationSession.getUserId(runId)
               .then(function(userId) {
                  return studyGuide.persistEditorsStatus(userId, req.param("studyGuideId"), req.param("editorIds"), req.param("status"), req.param("comment"));
               })
               .then(function(data) {
                  res.send(data);
               })
               .catch(function(err) {
                  res.send(err);
               });
         }
      }
   };
})();
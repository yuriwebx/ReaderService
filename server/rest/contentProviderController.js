(function() {
  'use strict';
  var contentProvider = require('./contentProvider.js');
  var applicationSession = require('./bl/applicationSessions');

  module.exports = {

    GET: {
      init : function(req, res) {
        var runId = req.headers['x-run-id'] || '';

        applicationSession.getUserId(runId)
          .then(function(userId) {
            return contentProvider.init(userId, req.query);
          })
          .then(function(publicationContent) {
            res.send(publicationContent);
          })
          .catch(function(err) {
            res.send(err);
          });
      },
      audioIndex : function(req, res) {
        var runId = req.headers['x-run-id'] || '';

        applicationSession.getUserId(runId)
          .then(function() {
            return contentProvider.getAudioIndex(req.query.id);
          })
          .then(function(audioIndex) {
            res.send(audioIndex);
          })
          .catch(function(err) {
            res.send(err);
          });
      }
    }

    /*,
      POST: {},
      DELETE: {},
      PUT:{}*/
  };
})();
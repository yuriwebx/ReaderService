(function() {
  'use strict';
  var studyCourses  = require('./studyCourses.js');
  var applicationSession  = require('./bl/applicationSessions');

  module.exports    = {

    GET: {
      get : function(req, res) {
        var runId = req.headers['x-run-id'] || '';

        function _sendResponse(result) {
          res.send(result);
        }

        function _onSuccessFilter() {
          studyCourses.getStudyCourse(req.query.id, req.query.collapseCourses === 'true').then(_sendResponse, _sendResponse);
        }

        applicationSession.getUserId(runId).then(_onSuccessFilter).fail(_sendResponse);

      },
      calcBookRangeProperties : function(req, res) {
        var runId = req.headers['x-run-id'] || '';
        studyCourses.calcBookRangeProperties(runId, req.query.bookId, req.query.paragraphRange)
        .then(function(properties) {res.send(properties);},
          function(err) {res.send(err);});
      }
    },

    POST: function(req, res) {
      var runId = req.headers['x-run-id'] || '';
      studyCourses.persistStudyCourse(runId, req.body.studyCourse)
        .then(function(id){res.send(id);}, function(err){res.send(err);});
    }

    /*,
      POST: {},
      DELETE: {},
      PUT:{}*/
  };
})();
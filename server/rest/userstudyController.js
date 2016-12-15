/*jslint node: true */
'use strict';
var applicationSession = require('./bl/applicationSessions');
var userstudy = require('./userstudy');

function _process(req, res, callback) {
   var runId = req.headers['x-run-id'] || '';
   var params = [].slice.call(arguments, 3);

   applicationSession.getUserId(runId)
      .then(function _onGetUserId(userId) {
         params.unshift(userId);
         return callback.apply(null, params);
      })
      .then(function _onSuccess(response) {
         if (typeof response === 'string' && 0 !== response.indexOf('"')) {
            response = '"' + response + '"';
         }
         res.send(response);
      })
      .catch(function _onError(err) {
         res.send(err);
      });
}

module.exports = {
   GET: {},
   POST: {
      initiate: function initiate (req, res) {
         var mode    = req.body.mode;
         var classId = req.body.classId;
         var publicationId = req.body.publicationId;
         _process(req, res, userstudy.initiate, mode, publicationId, classId);
      },
      persistprogress: function persistprogress (req, res) {
         _process(req, res, userstudy.persistProgress, req.body);
      },
      searchuserstudy: function searchuserstudy (req, res) {
         var classId       = req.param('classId');
         var filter        = req.param('filter');
         var category      = req.param('category');
         var interval      = req.param('interval');
         var itemsCount    = req.param('itemsCount');
         _process(req, res, userstudy.searchUserStudy, classId, filter, category, interval, itemsCount);
      },
      persistTest: function persistTest (req, res) {
         _process(req, res, userstudy.persistTest, req.body);
      },
      persistEssay: function (req, res) {
         _process(req, res, userstudy.persistEssay, req.body);
      },
      persistParagraphSummary: function (req, res) {
         _process(req, res, userstudy.persistParagraphSummary, req.body);
      },
      setprogress: function (req, res) {
         var classId    = req.body.classId;
         var progress   = req.body.progress;
         _process(req, res, userstudy.setUserStudyProgressClass, classId, progress);
      },
      readingprogresstracking: function (req, res) {
         _process(req, res, userstudy.persistReadingProgressTracking, req.body);
      }
   }
   /*,
    POST:{},
    DELETE: {},
    PUT:{}*/
};
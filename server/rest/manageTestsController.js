/*jslint node: true */
/*jslint camelcase: false */
(function () {
   "use strict";

   var manageTests = require('./manageTests.js');
   var applicationSession = require('./bl/applicationSessions');

   module.exports = {
      POST: {
         persistTest: function (req, res) {
            manageTests.persistTest(req.body).then(
                function (id) {
                   res.send(id);
                }, function (reason) {
                   res.send(reason);
                });
         },
         uploadAttachment: function (req, res) {
            manageTests.uploadAttachment(req.query, req.rawData).then(
                function (data) {
                   res.send(data);
                },
                function (reason) {
                   res.send(reason);
                }
            );
         },
         removeTests: function (req, res) {
            manageTests.removeTests(req.body.id).then(
               function () {
                  res.send('Ok');
               }, function (reason) {
                  res.send(reason);
               });
         }
      },
      GET: {
         getTest: function (req, res) {
            manageTests.getTest(req.query.id).then(
                function (data) {
                   res.send(data);
                }, function (err) {
                   res.send(err);
                });
         },
         getTestsList: function (req, res) {

            var runId = req.headers['x-run-id'] || '';
            applicationSession.getUserId(runId).then(_onSuccessFilter).fail(_onErrorFilter);

            function _onSuccessFilter(uid) {
              manageTests.getTestsList(req.query, uid).then(
                function(data) {
                  res.send(data);
                }, function(reason){
                  res.send(reason);
                });
            }

            function _onErrorFilter() {
                res.send([]);
            }
         },
         getFile: function(req, res) {
            manageTests.getFile(req.query).then(
                function (data) {
                   res.set({"Content-Type" : 'audio/mpeg'});
                   res.send(data);
                }, function (err) {
                   res.send(err);
                }
            );
         },
         searchTests: function(req, res) {
            var runId = req.headers['x-run-id'] || '';
            applicationSession.getUserId(runId).then(_onSuccessFilter).fail(sendData);

            function _onSuccessFilter() {
              manageTests.searchTests(req.query.criteria).then(sendData, sendData);
            }

            function sendData(data) {
              res.send(data);
            }
         }
      }
   };
})();
/*jslint node: true */
/*jslint camelcase: false */
(function () {
   'use strict';
   var applicationSession = require('./bl/applicationSessions');
   var db = require('./dao/utils').findDB();
   var content = require('./fetchblocks');
   module.exports = {
      POST : function (req, res) {
         var runId = req.headers['x-run-id'] || '';

         applicationSession.getUserData(runId).then(function (userData) {
            var reportData = {
               type : "UserReport",
               userId : userData._id,
               userEmail : userData.email || '',
               userName : userData.firstName || '' + ' ' + userData.lastName || '',
               added : (new Date()).getTime(),
               data : req.body.data
            };
            db.insert(reportData).then(function () {
               res.send('OK');
            });
         }, function (err) {
            res.send(err);
         });

      },

      GET : {
         info : function (req, res) {
            var count = req.query.count || 10;
            db.view('Views', 'userReports', {
               itemsCount : count,
               descending : true,
               include_docs : true
            }, function (err, result) {
               if (err) {
                  res.send(err);
               }
               else {
                  var reports = [];
                  if (result.rows && result.rows.length) {
                     result.rows.forEach(function (obj) {
                        reports.push(obj.doc);
                     });
                  }

                  res.send(reports);
               }
            });
         },
         content : function(req, res) {
            var bookId = req.query.bookId;
            var start = req.query.start;
            var end = req.query.end;

            content.fetch(bookId, start, end).then(function(content) {
               res.send(content);
            }).catch(function(err) {
               res.send(err);
            });
         }

      }
   };
})();
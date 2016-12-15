/*jslint node: true */
/*jslint camelcase: false */
(function () {
   'use strict';
   var applicationSession = require('./bl/applicationSessions');
   var dao = require('./invite');
   module.exports = {
      POST : function (req, res) {
         var runId = req.headers['x-run-id'] || '';

         applicationSession.getUserData(runId).then(function () {
            dao.sendEmailInvite(req.body.recipientIds, req.body.inviteContext, req.body.emailInfoParams, req.body.lang)
                .then(function() {
                   res.send('OK');
                });
         }, function (err) {
            res.send(err);
         });
      }
   };
})();
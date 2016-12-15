/*jslint node: true */
/*jslint camelcase: false */
(function() {

   'use strict';
   var utils = require('../utils/utils.js');
   var config = require('./../utils/configReader.js');

   var applicationSession = require('./bl/applicationSessions');

   function _authWrapper(res, runId, mode, loginInfo, externalLoginInfo, authorizedTaskLoginInfo) {
      var context = {};

      var def = applicationSession.performLogin(runId, context, mode, loginInfo, externalLoginInfo, authorizedTaskLoginInfo);

      def.then(function(info) {
         res.send(info);
      }, function(error) {
         res.send(error);
      });
   }

   module.exports = {
      POST : {
         email: function (req, res) {
            if (!req.body.userName || !req.body.password) {
               var response = utils.addSeverityResponse('No data passed.', config.businessFunctionStatus.error);
               res.send(response);
               return;
            }

            var runId = req.headers['x-run-id'] || '';

            var loginInfo = {
               login    : req.body.userName.toLowerCase(),
               password : req.body.password
            };

            _authWrapper(res, runId, 'Password', loginInfo);
         },
         hashcode: function(req, res){
            if (!req.body.taskConfirmationHashCode) {
               var response = utils.addSeverityResponse('No data passed.', config.businessFunctionStatus.error);
               res.send(response);
            }

            var runId = req.headers['x-run-id'] || '';

            var authorizedTaskLoginInfo = {
               taskConfirmationHashCode: req.body.taskConfirmationHashCode,
               taskHashCode            : ''
            };

            _authWrapper(res, runId, 'AuthenticationTask', null, null, authorizedTaskLoginInfo);

         },
         oauth: function (req, res) {
            if (!req.body.state) {
               var response = utils.addSeverityResponse('No data passed.', config.businessFunctionStatus.error);
               res.send(response);
            }

            var runId = req.headers['x-run-id'] || '';
/*
            var externalLoginInfo = {
               authorizationProvider   : '',
               externalSessionToken    : ''
            };
*/
            _authWrapper(res, runId, 'ExternalProvider', null, req.body);
         }
      },
      DELETE: function (req, res) {
         var runId = req.headers['x-run-id'] || '';
         applicationSession.performLogout(runId).then(function(){

            res.send('OK');
         });
      }
   };
})();

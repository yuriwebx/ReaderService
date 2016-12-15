/*jslint node: true */
/*jslint camelcase: false */
/*jshint unused: vars*/
'use strict';
var logger = require('../utils/logger.js');
var q = require('q');
var _str = require('underscore.string');
var dao = require('./dao/applicationSessionsDao');
var usersDao = require('./dao/usersDao');
var runIds = {};

module.exports = {
   PUT : function (req, res) {
      var messages = req.body;
      var emptyRunIds = {};
      res.send({});
      var messagesArr = [];
      var curRunIds = {};
      if (messages) {
         messages.forEach(function (message) {
            if (message.type === 'Log') {
               if (message.params && message.params.level) {
                  messagesArr.push(message);
                  curRunIds[message.runId] = message.runId;
               }
            }
         });
      }
      var queue = [];
      Object.keys(curRunIds).forEach(function (runId) {
         queue.push(getUserEmail(runId));
      });
      q.all(queue).then(function () {
         messagesArr.forEach(processMessage);
      });


      function getUserEmail(runId) {
         var deferred = q.defer();
         if (runIds[runId]) {
            deferred.resolve(runIds[runId]);
         }
         else if (emptyRunIds[runId]) {
            deferred.resolve('unauthed user');
         }
         else {
            dao.findById(runId).then(function (appData) {
               return runIds[runId] ? {email : runIds[runId]} : usersDao.findById(appData.userId || '');
            }).then(function (userData) {
               var email = userData.email;
               if (!email && userData.firstName && userData.externaluserid && userData.externaluserid[0]) {
                  email = [userData.firstName, userData.lastName, userData.externaluserid[0].authorizationProvider].join(' ');
               }
               deferred.resolve(email);
               runIds[runId] = email;
            }).catch(function () {
               emptyRunIds[runId] = true;
               deferred.resolve('unauthed user');
            });
         }
         return deferred.promise;
      }

      function processMessage(message) {
         getUserEmail(message.runId).then(
            function (userEmail) {
               var d = new Date(message.timestamp);
               var h = d.getHours();
               var m = d.getMinutes();
               var s = d.getSeconds();
               var ms = d.getMilliseconds();
               var ip = req.headers["X-Forwarded-For"] || req.headers["x-forwarded-for"] || req.client.remoteAddress;
               var actor = userEmail;
               if (/^[\d.]$/.test(ip)) {
                  ip = ip + ', ' + ip;
               }
               var line = _str.sprintf('(%s) [%s] [%s] %02d:%02d:%02d:%03d %s',
                  ip, message.params.windowId, actor,
                  h, m, s, ms,
                  message.text
               );
               logger.loggerLayer(message.params.level, line);
            }
         );

      }
   }
};
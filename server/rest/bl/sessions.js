(function() {
   'use strict';
   /* jshint camelcase:false */
   var q = require('q');
   var dao = require('../dao/sessionsDao');

   var utils = require('../../utils/utils');
   var config = require('../../utils/configReader.js');

   function Session(userId) {
      // this.sessionId     = sessionId;
      this.userId        = userId;
      this.clientNodeId  = '';
      this.startedAt     = new Date();
      this.endedAt       = '';
      this.active        = true;

      // this.context???
   }

   function isAliveSession(sid) {
      return dao.findById(sid).then(_aliveFilter).fail(function(){
         return q.reject(utils.addSeverityResponse('Session not active', config.businessFunctionStatus.error));
      });

      function _aliveFilter(session) {
         if (session.active) {
            return true;
         }
         return q.reject();
      }
   }

   function deactivateSession(sid){
      return dao.findById(sid).then(_deactivateFilter);

      function _deactivateFilter(data) {
         if (data) {
            data.endedAt = new Date();
            data.active = false;
            dao.save(data);
         }
      }
   }

   function startSession(user) {
      var session = new Session(user.id);
      return dao.save(session).then(function(session) {
         user.userId = user.id;
         session.user = user;
         return session;
      });
   }

   function findById(sid) {
      return dao.findById(sid);
   }

   module.exports = {
      isAlive     : isAliveSession,
      start       : startSession,
      get         : findById,
      deactivate  : deactivateSession
   };
})();

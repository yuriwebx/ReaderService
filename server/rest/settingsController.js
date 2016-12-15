/*jslint node: true */
(function () {
   'use strict';

   var dao = require('./dao/settingsDao');
   var applicationSession = require('./bl/applicationSessions');
   var logger = require(__dirname + '/../utils/logger.js').getLogger(__filename);

   // rem after update underscore
   function property(prop) {
      return function(obj) {
         return obj[prop];
      };
   }

   // rem after update underscore
   function identity(val) {
      return function() {
         return val;
      };
   }

   module.exports = {
      POST : function (req, res) {
         var runId = req.headers['x-run-id'] || '';
         var setting = req.body;

         applicationSession.getUserId(runId).then(function (uid) {
            setting.userId = uid;
            setting.type   = 'Setting';
            return dao.find(uid, setting.group, setting.name).fail(identity(setting)).then(_merge).then(dao.save);
         }).then(_onSuccess, _onReject);

         function _onReject(e) {
            logger.error(e, true);
            res.send('Error saving');
         }
         function _onSuccess(data) {
            res.send(data);
         }
         function _merge(stored) {
            stored.value = setting.value;
            stored.setAt = new Date();
            return stored;
         }
      },
      GET : function (req, res) {
         var runId = req.headers['x-run-id'] || '';
         applicationSession.getUserId(runId).then(dao.getAll).then(_onSuccess, _onReject);

         function _onReject(e) {
            res.send(e);
         }
         function _onSuccess(settings) {
            res.send(settings.map(property('value')));
         }
      }
   };
})();

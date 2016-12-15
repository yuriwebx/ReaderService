/*jslint node: true */
/*jslint camelcase: false */
(function() {
   'use strict';
   var q = require('q');

   var db = require('./utils').findDB();

   var config = require('../../utils/configReader.js');
   var utils = require('../../utils/utils.js');

   function save(session) {
      var deferred = q.defer();
      session.type = 'ApplicationSession';
      db.insert(session, function(err, sess) {
         if (sess && !err) {
            deferred.resolve(sess);
         }
         else {
            deferred.reject(utils.addSeverityResponse(err.description, config.businessFunctionStatus.error));
         }
      });
      return deferred.promise;
   }

   function findById(id) {
      var deferred = q.defer();
      var opts = {
         revs_info: true
      };
      if(id) {
         db.get(id, opts, function (err, body) {
            if (!err && body) {
               deferred.resolve(body);
            }
            else {
               deferred.reject(err);
            }
         });
      }
      else {
         deferred.reject();
      }
      return deferred.promise;
   }

   function saveMany(sessions) {
      var deferred = q.defer();
      db.bulk({docs : sessions}, function(err, body) {
         if (!err && body) {
            deferred.resolve(body);
         }
         else {
            deferred.reject(err);
         }
      });
      return deferred.promise;
   }

   function findActivity(userActivityKey) { // [name, relatedEntityId]
      var _view = 'applicationSessionUserActivitySummary';
      var _list = 'uniqueUserActivitySummary';

      return q.nfcall(db.view_with_list, 'Views', _view, _list, {
         startkey       : userActivityKey,
         endkey         : userActivityKey.concat({}),
         include_docs   : true
      })
      .spread(function onView (body) {
         return body;
      });
   }

   function findActiveSessions() {
      return q.nfcall(db.view, 'Views', 'applicationSessionActive', {
         include_docs : true
      })
      .spread(function onView (body) {
         return body.rows;
      });
   }

   module.exports = {
      findActivity         : findActivity,
      findById             : findById,
      findActiveSessions   : findActiveSessions,
      save                 : save,
      saveMany             : saveMany
   };
})();

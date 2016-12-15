(function() {
   'use strict';
   var q = require('q');

   var db = require('./utils').findDB();

   function save(setting) {
      var deferred = q.defer();
      setting.type = 'Setting';
      db.insert(setting, function(err, body) {
         if (err) {
            return deferred.reject(err);
         }
         setting._id = body.id;
         deferred.resolve(setting);
      });

      return deferred.promise;
   }

   function getAll(uid) {
      var deferred = q.defer();
      var opts = { key : uid };
      db.view('Views', 'settingsByUid', opts, function (err, results) {
         if (err) {
            return deferred.reject(err);
         }
         deferred.resolve(results.rows);
      });
      return deferred.promise;
   }

   function find(uid, settingGroup, settingName) {
      var deferred = q.defer();
      /* jshint camelcase:false */
      var opts = {
         key         : [uid, settingGroup, settingName],
         include_docs: true
      };
      /* jshint camelcase:true */

      db.view('Views', 'settingsByFK', opts, function (err, results) {
         if (err) {
            deferred.reject({
               text  : err.description,
               error : err.error
            });
         }
         else if (results.rows.length === 0) {
            deferred.reject();
         }
         else {
            deferred.resolve(results.rows[0].doc);
         }
      });
      return deferred.promise;
   }

   module.exports = {
      getAll   : getAll,
      save     : save,
      find     : find
   };
})();

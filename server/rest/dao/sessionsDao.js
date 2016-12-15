(function() {
   'use strict';
   var q = require('q');

   var db = require('./utils').findDB();

   var config = require('../../utils/configReader.js');
   var utils = require('../../utils/utils.js');

   function save(session) {
      var deferred = q.defer();
      session.type = 'Session';
      db.insert(session, function(err, sess) {
         if (sess && !err) {
            session._id = sess.id;
            deferred.resolve(session);
         } else {
            deferred.reject(utils.addSeverityResponse(err.description, config.businessFunctionStatus.error));
         }
      });

      return deferred.promise;
   }

   function findById(id) {
      var deferred = q.defer();
      /* jshint camelcase:false */
      var opts = {
         revs_info: true
      };
      /* jshint camelcase:true */
      db.get(id, opts, function (err, body) {
         if (!err && body) {
            deferred.resolve(body);
         }
         else{
            deferred.reject(err);
         }
      });
      return deferred.promise;
   }

   module.exports = {
      findById    : findById,
      save        : save
   };
})();

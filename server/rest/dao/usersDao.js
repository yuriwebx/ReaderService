/*jshint camelcase: false */
(function() {
   'use strict';
   var q = require('q');
   var _ = require('underscore');
   var db = require('./utils').findDB();

   var config = require('../../utils/configReader.js');
   var utils = require('../../utils/utils.js');
   var agentTools = require('../../utils/agent-lib.js');

   function findByEmail(email) {
      var deferred = q.defer();

      db.view('Views', 'usersByEmail', {key : email || "", include_docs: true}, function (err, body) {
         if (!err && body.rows && body.rows[0]) {
            deferred.resolve(body.rows[0].doc);
         }
         else {
            deferred.reject(utils.addSeverityResponse('The e-mail or password you provided is not correct. Please try again.', config.businessFunctionStatus.error));
         }
      });

      return deferred.promise;
   }

   function findById(userId, params) {
      var deferred = q.defer();
      params = params || {};
      db.get(userId, params, function (err, body) {
         if (err) {
            deferred.reject(utils.addSeverityResponse(err.description, config.businessFunctionStatus.error));
         }
         else if (_.has(body, '_id')) {
            deferred.resolve(body);
         } else {
            deferred.reject({});
         }
      });
      return deferred.promise;
   }

   function findByOauth(keyOauth) {
      var deferred = q.defer();
      db.view('Views', 'usersByOauth', {key : keyOauth, include_docs: true}, function (err, results) {
         if (err) {
            deferred.reject(utils.addSeverityResponse(err.description, config.businessFunctionStatus.error));
         }
         else if (results.rows.length === 0) {
            deferred.reject(utils.addSeverityResponse('User has not found by id.', config.businessFunctionStatus.error));
         }
         else {
            deferred.resolve(results.rows[0].doc);
         }
      });
      return deferred.promise;
   }

   function save(user, sendStatus) {
      var deferred = q.defer();
      user.type = 'UserProfile';
      user.modifiedAt = new Date().toString();
      ['isValidPassword', 'password', 'userId'].forEach(function(key){
         delete user[key];
      });
      // add sync credentials


      db.insert(user).then(
         function (body) {
            user._id = body.id;
            user._rev = body.rev;
            agentTools.persistSyncData(user) // FIX: currently it needs to be sync.user == user.id, so user.id must be set already
               .then(function(user) {
                  agentTools.cleanup(user);
                  return db.insert(user);
               }).then(function(){
                  deferred.resolve(sendStatus ? {status : config.businessFunctionStatus.ok} : user);
               });
         },
         function (err) {
            deferred.reject(utils.addSeverityResponse(err.description, config.businessFunctionStatus.error));
         }
      );

      return deferred.promise;
   }

   module.exports = {
      findByOauth : findByOauth,
      findByEmail : findByEmail,
      findById    : findById,
      save        : save
   };
})();

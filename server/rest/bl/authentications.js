(function() {
   'use strict';
   var config = require('../../utils/configReader.js');
   var q = require('q');
   var usersDao = require('../dao/usersDao');
   var emailAuthTaskDao = require('../dao/emailAuthenticationTaskDao');
   var _ = require('underscore');
   var utils = require('../../utils/utils.js');
   var oauth = require('./externalAuthentications.js');

   var AuthenticationModeEnum = {
      'Password'           : passwordAuthentication,
      'ExternalProvider'   : externalAuthentication,
      'AuthenticationTask' : hashCodeRegistration
   };

   /**
    * Simple login/password auth.
    * @param {Object} loginInfo - info for auth.
    * @param {string} loginInfo.login     - client's email.
    * @param {string} loginInfo.password  - client's password.
    */
   function passwordAuthentication(loginInfo) {
      var email = loginInfo.login;

      return usersDao.findByEmail(email).then(function(user) {
         var salt = user.passwordSalt;
         var hash = user.passwordHash;
         var encMethod = user.passwordEncodingMethod;
         var password = loginInfo.password && loginInfo.password.trim() || '';
         var passwordHash = utils.getHash(password, salt, encMethod);

         if (hash !== passwordHash || !hash) {
            return q.reject(utils.addSeverityResponse('Wrong password.', config.businessFunctionStatus.error));
         }
         else if ( user.active === 'Declined' ) {
            return q.reject(utils.addSeverityResponse('User with email address ' + email + ' is inactive.', config.businessFunctionStatus.error));
         }
         else {
            return user;
         }
      });
   }

   /**
    * Authentication with oauth.
    * @param {Object} externalLoginInfo - info for auth.
    * @param {string} externalLoginInfo.authorizationProvider
    * @param {string} externalLoginInfo.externalSessionToken
    */
   function externalAuthentication(externalLoginInfo) {
      return oauth.getExternalProfile(externalLoginInfo).then(_externalFilter);

      function _externalFilter(externalUserProfile) {
         return usersDao.findByEmail(externalUserProfile.email).then(_successEmailFilter, _errorEmailFilter);

         function _successEmailFilter(user) {
            var externaluserid = _.pick(externalUserProfile, 'authorizationProvider', 'idFromAuthorizationProvider');
            if ( user.active === 'Declined' ) {
               return q.reject(utils.addSeverityResponse('User with email address ' + externalUserProfile.email + ' is inactive.', config.businessFunctionStatus.error));
            }
            else if (!_.some(user.externaluserid, _matches(externaluserid)) || (!user.email && externalUserProfile.email)) {
               return oauth.registerExternalProfile(externalUserProfile, user);
            }
            else {
               return user;
            }

            // TODO update underscore and use '_.matches(obj)' for it
            function _matches(obj) {
               return function(liken) {
                  return obj.authorizationProvider === liken.authorizationProvider &&
                         obj.idFromAuthorizationProvider === liken.idFromAuthorizationProvider;
               };
            }
         }

         function _errorEmailFilter() {
            var keyOauth = externalUserProfile.authorizationProvider + '/' + externalUserProfile.idFromAuthorizationProvider;
            return usersDao.findByOauth(keyOauth)
               .then(function(user){
                  if(!user.email && externalUserProfile.email){
                     return oauth.registerExternalProfile(externalUserProfile, user);
                  }
                  else {
                     return user;
                  }
               })
               .fail(function() {
               return oauth.registerExternalProfile(externalUserProfile);
//                  .then(function () {
//                     return q.reject(utils.addSeverityResponse('User with email address ' + externalUserProfile.email + ' is not approved yet.', config.businessFunctionStatus.error));
//                  });
            });
         }
      }
   }

   /**
    * registation use email.
    * @param {Object} authorizedTaskLoginInfo - info for registration.
    * @param {string} authorizedTaskLoginInfo.taskHashCode
    * @param {string} authorizedTaskLoginInfo.taskConfirmationHashCode
    */
   function hashCodeRegistration(authorizedTaskLoginInfo) {
      var hashCode = authorizedTaskLoginInfo.taskConfirmationHashCode;
      return emailAuthTaskDao.findByConfirmationHashCode(hashCode).then(_successTaskFilter);

      function _successTaskFilter(task) {
         var currentDate = new Date().getTime();
         if (task.expiredAt >= currentDate && task.status === config.authenticationTaskStatus.confirm) {
            return usersDao.findByEmail(task.email).then(_successUserFilter);
         }
         else if (task.status === config.authenticationTaskStatus.processed) {
            return usersDao.findByEmail(task.email);
         }
         else if (task.expiredAt <= currentDate) {
            if (task.status !== config.authenticationTaskStatus.expired) {
               task.status = config.authenticationTaskStatus.expired;
               emailAuthTaskDao.updateStatus(task);
            }
            return q.reject(utils.addSeverityResponse('hashcode expired ' + task.expiredAt + ' currentDate ' + currentDate, config.businessFunctionStatus.error));
         }
         else {
            return q.reject(utils.addSeverityResponse('Hashcode already processed ' + hashCode, config.businessFunctionStatus.error));
         }

         function _successUserFilter(user) {
            task.status = config.authenticationTaskStatus.processed;
            task.taskConfirmationHashCode = null;
            return emailAuthTaskDao.updateStatus(task).then(function() {
               return user;
            });
         }
      }
   }

   function auth(mode, info) {
      var defer = AuthenticationModeEnum[mode];
      if (defer) {
         return defer(info);
      }
      return q.reject(utils.addSeverityResponse('Unsupported mode auth - ' + mode, config.businessFunctionStatus.error));
   }

   module.exports = {
      doAuth                  : auth,
      AuthenticationModeEnum  : Object.keys(AuthenticationModeEnum)
   };
})();

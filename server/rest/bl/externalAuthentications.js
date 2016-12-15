/* jslint camelcase:false */
/* jslint node:true */
(function () {
   'use strict';
   var config = require('../../utils/configReader.js');
   var q = require('q');
   var _ = require('underscore');
   var request = require('request');
   var logger = require('../../utils/logger.js').getLogger(__filename);
   var crypto = require('crypto');
   var usersDao = require('../dao/usersDao');
   var utils = require('../../utils/utils');


   var useProxy = true;
   if (config && config.environment_name && config.environment_name.indexOf('public') === 0 || config.useProxy===false) {
       useProxy = false;
   }
   var defaults = {};
   if (useProxy) {
      defaults = {'proxy' : config.proxyServer};
   }
   request = request.defaults(defaults);

   //oauth providers object
   var providers = config.oauth.services;

   var twitterRequest = function (operation, data) {
      var authOptions = providers.twitter,
          method = authOptions[operation].method,
          url = authOptions[operation].url;

      method = method.toUpperCase();
      data = data || {};
      var createSign = function (options) {
         var str = [method, encodeURIComponent(url), ''].join('&');
         var opts = [], keys = ['callback', 'consumer_key', 'nonce', 'signature_method', 'timestamp', 'token', 'version', 'verifier'];
         for (var i = 0; i < keys.length; i++) {
            if (options.hasOwnProperty('oauth_' + keys[i]) && options['oauth_' + keys[i]]) {
               opts.push('oauth_' + keys[i] + '=' + options['oauth_' + keys[i]]);
            }
         }
         str += encodeURIComponent(opts.join('&'));
         return crypto.createHmac('sha1', [authOptions.secret, data.token_secret || ''].join('&')).update(str).digest('base64');
      };

      var createAuthHeader = function (options) {
         var header = 'OAuth ', j = true, keys = ['consumer_key', 'nonce', 'signature', 'signature_method', 'timestamp', 'token', 'version', 'verifier'];
         for (var i = 0; i < keys.length; i++) {
            if (options.hasOwnProperty('oauth_' + keys[i]) && options['oauth_' + keys[i]]) {
               header += (j ? '' : ', ') + 'oauth_' + keys[i] + '="' + encodeURIComponent(options['oauth_' + keys[i]]) + '"';
               j = false;
            }
         }
         return header;
      };

      var authValues = {
         oauth_consumer_key : authOptions.key,
         oauth_nonce : crypto.createHash('md5').update((new Date()).getTime().toString() + Math.random()).digest("hex"),
         oauth_signature_method : "HMAC-SHA1",
         oauth_timestamp : Math.round((new Date()).getTime() / 1000),
         oauth_version : "1.0"
      };
      for (var i in data) {
         if (data.hasOwnProperty(i)) {
            authValues[(i.indexOf('oauth_')===-1?'oauth_':'') + i] = data[i];
         }
      }

      if (authValues.oauth_callback) {
         authValues.oauth_callback = encodeURIComponent(authValues.oauth_callback);
      }
      authValues.oauth_signature = createSign(authValues);
      var requestOptions = {
         method : method,
         url : url,
         headers : {
            Authorization : createAuthHeader(authValues)
         }
      };
      if (data.callback) {
         requestOptions.form = {oauth_callback : data.callback};
      }
      return _makeRequest(requestOptions, _.identity);
   };

   var _checkToken = function(data){
      var provider = data.state;
      if (provider === 'twitter') {
         return _checkTwitterToken(data);
      }
      else {
         var deferred = q.defer();
         deferred.resolve({provider: provider, accessToken: data.access_token || ''});
         return deferred.promise;
      }
   };

   function _checkTwitterToken(data) {
      return twitterRequest('accessToken', data).then(_twitterAccessTokenFilter);

      function _twitterAccessTokenFilter(data) {
         var response = {};
         data.split('&').map(function (el) {
            if (el) {
               var e = el.split('='), i = e.shift();
               response[i.replace('oauth_', '')] = e.join('=');
            }
         });
         if (response.token) {
            response.provider = 'twitter';
            return response;
         }
         else {
            return q.reject(utils.addSeverityResponse(data, config.businessFunctionStatus.error));
         }
      }
   }

   function validateProfile(data) {
      var provider = data.provider;
      if (providers[provider].validate) {
         var url = providers[provider].validate + data.accessToken;
         // TODO update underscore and use '_.constant(data)'
         var callback = function() {
            return data;
         };
         return _makeRequest(url, callback);
      }
      else {
         logger.log('No validation for ' + provider);
         return data;
      }
   }
   var profileDetector = {
      'facebook'  : getFacebookProfile,
      'google'    : getGoogleProfile,
      'twitter'   : getTwitterProfile
   };

   function getExternalProfile(data) {
      return _checkToken(data).then(validateProfile).then(profileDetector[data.state]);
   }

   function getFacebookProfile(data) {
      var url = providers.facebook.getProfile + data.accessToken;
      return _makeRequest(url, _convertFacebookUser);

      function _convertFacebookUser(facebookUser) {
         facebookUser = JSON.parse(facebookUser);

         return {
            idFromAuthorizationProvider   : facebookUser.id,
            authorizationProvider   : 'facebook',
            firstName   : facebookUser.first_name,
            lastName    : facebookUser.last_name,
            email       : facebookUser.email,
            photo       : 'https://graph.facebook.com/' + facebookUser.id + '/picture?type=large'
         };
      }
   }

   function getGoogleProfile(data) {
      var url = providers.google.getProfile + data.accessToken;
      return _makeRequest(url, _convertGoogleUser);

      function _convertGoogleUser(googleUser) {
         googleUser = JSON.parse(googleUser);

         var email = googleUser.emails ? googleUser.emails[0].value : '';
         return {
            idFromAuthorizationProvider   : googleUser.id,
            authorizationProvider   : 'google',
            firstName   : googleUser.name.givenName,
            lastName    : googleUser.name.familyName,
            email       : email,
            photo       : googleUser.image.url.split('?sz=50')[0] + '?sz=200'

         };
      }
   }

   function getTwitterProfile(data) {
      return twitterRequest('getProfile', data).then(_convertTwitterUser);

      function _convertTwitterUser(twitterUser) {
         twitterUser = JSON.parse(twitterUser);

         var res = {
            idFromAuthorizationProvider   : twitterUser.id,
            authorizationProvider   : 'twitter',
            email       : '',
            photo       : twitterUser.profile_image_url
         };
         var name = twitterUser.name || twitterUser.screen_name;
         name = name.trim().split(/\s+/);
         res.firstName = name.shift();
         name = name.join(' ');
         res.lastName = name;

         return res;
      }
   }

   function _makeRequest(options, converterFunc) {
      var deferred = q.defer();
      request(options, function (error, response, body) {
         if (!error && response.statusCode === 200) {
            deferred.resolve(converterFunc(body));
         }
         else {
            deferred.reject(utils.addSeverityResponse(error, config.businessFunctionStatus.error));
         }
      });
      return deferred.promise;
   }

   function updateUserWithPhoto(user, externalUserProfile){
      if (!user.photo && externalUserProfile.hasOwnProperty('photo') && externalUserProfile.photo.length > 0) {
         return _getImage(externalUserProfile.photo)
            .then(function (blob) {
               return utils.uploadAttachment({fileType : 'image/png'}, blob);
            })
            .then(function (hash) {
               user.photo = hash;
               return user;
            })
            .catch(function () {
               user.photo = '';
               return user;
            });

      }
      else {
         return q.when(user);
      }
   }

   function registerExternalProfile(externalUserProfile, user) {
      user = user || {};
      var userData = {
         active : 'Registered',
         adminRole : false,
         editorRole : false,
         registeredAt : new Date().toString(),
         lastName : externalUserProfile.lastName,
         firstName : externalUserProfile.firstName,
         email : externalUserProfile.email || ''
      };
      if (userData.email) {
         userData.emailConfirmationStatus = config.emailConfirmationStatus.confirmedByExternalProvider;
      }
      userData.externaluserid = [_.pick(externalUserProfile, 'authorizationProvider', 'idFromAuthorizationProvider')];
      _.defaults(user, userData);
      return updateUserWithPhoto(user, externalUserProfile).then(function(user){
         return usersDao.save(user);
      });
   }

   var _getImage = function(link){
      var deferred = q.defer();
      request.get({url: link, encoding: 'binary'}, function (err, response, body) {
        if(!err){
            deferred.resolve(new Buffer(body, "binary"));
        }
        else{
            deferred.reject(utils.addSeverityResponse(err, config.businessFunctionStatus.error));
        }
      });
      return deferred.promise;
   };

   module.exports = {
      registerExternalProfile : registerExternalProfile,
      getExternalProfile      : getExternalProfile,
      twitterRequest          : twitterRequest
   };

})();

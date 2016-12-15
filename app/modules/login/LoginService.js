/*jslint camelcase: false */
define([
   'module',
   'swServiceFactory',
   'swAppUrl',
   'text!./Login.html'
], function (module, swServiceFactory, swAppUrl, template) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
         'swSubmachine',
         '$q',
         'swI18nService',
         'swPopupService',
         'swUserService',
         '$rootScope',
         function (
            swSubmachine,
            $q, 
            swI18nService,
            swPopupService,
            swUserService,
            $rootScope
            ) {
            /* --- api --- */
            this.autoLogIn = autoLogIn;
            this.logout = logout;
            this.getPlaceholderLocalizedName = getPlaceholderLocalizedName;
            this.getURL = getURL;
            this.showLoginPopup = showLoginPopup;
            this.performLogin = performLogin;

            /* === impl === */

            function showLoginPopup($event) {
               var element = $event.target;
               var scope = $rootScope.$new();
               scope.loginInfo = {userName: '', password: ''};
               scope.errorMessage = '';

               scope.logIn = function () {
                  performLogin(scope.loginInfo, 'email', true).then(function (loginResult) {
                     if ( loginResult.status === 'loggedIn' ) {
                        swSubmachine.getStack()[0].submachine.go('Portal');
                        scope.loginPopup.hide();
                     }
                     else {
                        scope.errorMessage = loginResult.message;
                     }
                  });
                  return false;
               };

               scope.loginPopup = swPopupService.show({
                  scope: scope,
                  template: template,
                  customClass: 'login-popup-dialog',
                  layout: {
                     margin: {
                        top: 50
                     },
                     of: {
                        clientRect: element.getClientRects()[0]
                     },
                     my: 'LT',
                     at: 'LB',
                     arrow: true
                  },
                  backdropVisible: true,
                  buttons: [
                     {
                        name: 'login',
                        type: '',
                        click: scope.logIn
                     }
                  ]
               });

               scope.registerUser = function () {
                  swSubmachine.getStack()[0].submachine.go('RegisterUserProfile');
                  scope.loginPopup.hide();
               };
               scope.resetPassword = function () {
                  swSubmachine.getStack()[0].submachine.go('ResetPassword');
                  scope.loginPopup.hide();
               };

               scope.filterPassword = function () {
                  scope.loginInfo.password = scope.loginInfo.password && scope.loginInfo.password.trim();
               };

               scope.google_oauth = getURL('google');
               scope.twitter_oauth = getURL('twitter');
               scope.facebook_oauth = getURL('facebook');
            }

            function performLogin(userInfo, authType, dontShowMessageInPopup) {
               if ( dontShowMessageInPopup ) {
                  //debugger;//service client - result is not used
                  return swUserService.authenticate(userInfo, authType);
               }
               else {
                  //debugger;//service client - tested
                  return swUserService.authenticate(userInfo, authType).then(_showLoginResult, _showLoginResult);
               }

               function _showLoginResult(authResult) {
                  return authResult;
               }
            }

            function autoLogIn() {
               if ( swAppUrl.oauth ) {
                  var oauth = swAppUrl.oauth;
                  swAppUrl.oauth = undefined;
                  return performLogin(oauth, 'oauth');
               }
               else {
                  var defer = $q.defer();
                  defer.resolve();
                  return defer.promise;
               }
            }

            function logout() {
               //debugger;//service client - result is not used
               return swUserService.logout();
            }

            function getPlaceholderLocalizedName(placeholder) {
               return swI18nService.getResource(placeholder);
            }

            function getURL(providerName, protocol) {
               return swUserService.getOAuthUri(providerName, protocol);
            }

         }]
   });
});
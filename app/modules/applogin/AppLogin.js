/*jslint camelcase: false */
define([
   'underscore',
   'Context',
   'swComponentFactory',
   'module',
   'swAppUrl',
   'text!./AppLogin.html',
   'less!./AppLogin'

], function (_,
             Context,
             swComponentFactory,
             module,
             swAppUrl,
             template) {

   'use strict';

   swComponentFactory.create({
      module : module,
      template : template,
      submachine : true,
      isolatedScope : {
         id : '@'
      },
      controller : ['$scope',
                    'swLoginService',
                    '$window',
                    'swLocalStorageService',
                    'swValidationService',
         function ($scope,
                   swLoginService,
                   window,
                   swLocalStorageService,
                   swValidationService) {

            var vm = $scope;
            var loginStart = false;
            var isValidLogin = true;
            /* --- api --- */
            vm.visible  = !swAppUrl.oauth;
            vm.login    = login;
            vm.loginOauth     = loginOauth;
            vm.registerUser   = registerUser;
            vm.resetPassword  = resetPassword;
            vm.filterPassword = filterPassword;
            vm.validateLogin = validateLogin;

            vm.loginInfo   = {userName : '', password : ''};
            vm.configInfo  = Context.parameters;

            /* --- impl --- */

            swLoginService.autoLogIn().then(_onLogin);

            function login() {
               if (!loginStart && $scope.swSubmachine.state() !== '$end') {
                  loginStart = true;
                  performLogin(vm.loginInfo, 'email');
               }
            }

            function registerUser() {
               $scope.swSubmachine.end('registerProfile');
            }

            function resetPassword() {
               $scope.swSubmachine.end('resetPassword');
            }

            function loginOauth(type) {
               var url = swLoginService.getURL(type);
               if (!!window.cordova) {
                  cordovaLoginOauth(type, url);
               }
               else {
                  window.location.href = url;
               }
            }

            function cordovaLoginOauth(type, url) {
               var authWindow = window.open(url, '_blank', 'location=no,toolbar=no');

               authWindow.addEventListener('loadstart', function (e) {
                  var ourl = (typeof e.url !== 'undefined' ? e.url : e.originalEvent.url);

                  if (
                     ourl.indexOf('access_token=') > -1 ||
                     ourl.indexOf('error=') > -1 ||
                     (ourl.indexOf('oauth_token=') > -1 && ourl.indexOf('oauth_verifier=') > -1)
                  ) {
                     authWindow.close();
                  }
                  if (ourl.indexOf('access_token=') > -1) {
                     var accessToken = (/access_token=([^&#]+)/.exec(ourl))[1];
                     performLogin({state : type, access_token : accessToken}, 'oauth');
                  }
                  if (ourl.indexOf('oauth_token=') > -1 && ourl.indexOf('oauth_verifier=') > -1) {
                     var requestToken = (/oauth_token=([^&#]+)/.exec(ourl))[1];
                     var verifier = (/oauth_verifier=([^&#]+)/.exec(ourl))[1];
                     performLogin({state : type, token : requestToken, verifier : verifier}, 'oauth');
                  }
               });
            }

            function performLogin(info, type) {
               swLoginService.performLogin(info, type).then(_onLogin, _onError);
            }

            function _onLogin(loginResult) {
               loginStart = false;
               if (loginResult && loginResult.status === 'loggedIn') {
                  isValidLogin = true;
                  swAppUrl.fragment = swLocalStorageService.get('fragmentOfShareUrl');
                  swLocalStorageService.remove('fragmentOfShareUrl');
                  $scope.swSubmachine.end('loggedIn');
               }
               else if (_.has(loginResult, 'status')){
                  if (loginResult.status === 'pendingLogIn') {
                     $scope.swSubmachine.end('pendingLogIn');
                  }
                  else {
                     isValidLogin = false;
                     swValidationService.setValidationMessagesEnabled($scope.form, true);
                  }
               }
            }

            function _onError() {
               loginStart = false;
               isValidLogin = true;
            }

            function filterPassword () {
               vm.loginInfo.password = vm.loginInfo.password && vm.loginInfo.password.trim();
            }

         function validateLogin() {
            return {
               required: {
                  value: 'empty'
               },
               passwordLogin: {
                  valid: isValidLogin,
                  active: true
               }
            };
            }
         }]
   });

});

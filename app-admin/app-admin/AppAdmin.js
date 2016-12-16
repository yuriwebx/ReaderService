define([
    'swComponentFactory',
    'module',
    'text!./AppAdmin.html',
    'less!./AppAdmin'

], function (swComponentFactory, module, template) {

   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      submachine: true,
      controller: ['$scope', 'swUserService', 'swLoginService', '$window', 'swApplicationService',
           function($scope, swUserService, swLoginService, $window, swApplicationService)
      {

         $scope.config = {};
         $scope.swSubmachine.configure({
            'ManageUsers': {
              uri: 'manageusers'
            },
            'ManageReports': {
              uri: 'managereports'
            },
            'LibraryView': {
              uri: 'libraryview'
            }
         });

         $scope.swInit = function()
         {
            swUserService.bootstrapApplication().then(_autoLogIn).then(_confirmAuthorizedTask).then(_goOnConfirm, _goOnAuth);
         };

         function _autoLogIn() {
            return swLoginService.autoLogIn();
         }

         function _goOnConfirm(result) {
            $scope.config.taskConfirmationHashCode = result.taskConfirmationHashCode;
            $scope.swSubmachine.go(result.useCaseToGo);
         }

         function _goOnAuth() {
            if (!swUserService.isAuthenticated()) {
               $scope.swSubmachine.go('Login');
            }
            else {
               if (swUserService.getUser().adminRole) {
                  $scope.swSubmachine.go('ManageUsers');
               }
               else {
                  _goToPortal();
               }
            }
         }

         function _goToPortal() {
            $window.location.href = $window.location.href.replace(/\/admin\/([^\/]*#.*)$/, '/portal/$1');
         }

         function _confirmAuthorizedTask() {
            return swApplicationService.confirmAuthorizedTask();
         }

         $scope.swSubmachine.$onLogin$loggedIn = function()
         {
            if (swUserService.getUser().adminRole) {
               $scope.swSubmachine.go('ManageUsers');
            }
            else {
               _goToPortal();
            }
         };
         $scope.swSubmachine.$onLogin$registerProfile = function () {
            $scope.swSubmachine.go('RegisterUserProfile');
         };
         $scope.swSubmachine.$onLogin$resetPassword = function () {
            $scope.swSubmachine.go('ResetPassword');
         };
         $scope.swSubmachine.$onRegisterUserProfile$completed = function () {
            $scope.swSubmachine.$onLogin$loggedIn();
         };
         $scope.swSubmachine.$onResetPassword$completed = function () {
            $scope.swSubmachine.$onLogin$loggedIn();
         };

         $scope.signIn = function(){
            $scope.swSubmachine.go('Login');
         };

         $scope.checkRanderState = function(){
          return $scope.swSubmachine.state('RegisterUserProfile') ||  $scope.swSubmachine.state('ResetPassword');
         };

         $scope.swSubmachine.$onLibraryView$enter = $scope.swSubmachine.$onManageUsers$enter = function () {
            if (!(swUserService.isAuthenticated() && swUserService.getUser().adminRole)) {
               _goToPortal();
            }
         };

      }]
    });
});
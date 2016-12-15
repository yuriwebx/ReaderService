define([
    'swComponentFactory',
    'module',
    'text!./AppEditor.html',
    'less!./AppEditor'

], function (swComponentFactory, module, template) {

   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      submachine: true,
      controller: ['$scope', '$window', 'swUserService',
           function($scope, $window, swUserService)
      {
         $scope.swInit = function()
         {
            if (!swUserService.isAuthenticated())
            {
               $scope.swSubmachine.go('Login');
            }
            else
            {
               if(swUserService.getUser().isEditor) {
                  $scope.swSubmachine.go('Editor');
               }
               else {
                  $window.location.href = $window.location.href.replace('/editor/','/reader/');
               }
            }
         };
         
         $scope.swSubmachine.$onLogin$loggedIn = function()
         {
            if(swUserService.getUser().isEditor) {
               $scope.swSubmachine.go('Editor');
            }
            else {
               $window.location.href = $window.location.href.replace('/editor/','/reader/');
            }
         };
      }]
    });
});
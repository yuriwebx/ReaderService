/*jslint camelcase: false */
define([
    'swComponentFactory',
    'module',
    'text!./Login.html',
    'less!./Login'

], function (swComponentFactory, module, template) {

   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      submachine: true,
      controller: ['$scope', 'swLoginService',
      function($scope, swLoginService)
      {
         $scope.loginInfo = {userName: '', password: ''};
         $scope.google_oauth = swLoginService.getURL('google');
         $scope.facebook_oauth = swLoginService.getURL('facebook');
      }]
   });
});
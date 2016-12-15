define([
   'module',
   'swComponentFactory',
   'text!./PersonalMessagesMenu.html',
   'less!./PersonalMessagesMenu.less'
], function(module, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      controller: [
         '$scope',
         function(
            $scope) {
            $scope.swInit = function() {};
         }
      ]
   });
});
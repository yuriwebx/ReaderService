define([
   'jquery',
   'module',
   'swComponentFactory',
   'text!./Profile.html',
   'less!./Profile.less'
], function($, module, swComponentFactory, template) {
   'use strict';
   
   swComponentFactory.create({
      module : module,
      template : template,
      controller : ['$scope', 'swProfileService', '$timeout', function($scope, swProfileService, $timeout) {
          var messageElement = $("#profileMessage");
          $scope.swInit = function()
          {
             messageElement.hide();
             $scope.profile = swProfileService.getProfile();
             
             $scope.save = function(){
                $scope.logger.debug("save button click");
                swProfileService.setProfile($scope.profile);
                messageElement.fadeIn(300, function() {
                   $timeout(function() {
                      messageElement.fadeOut(300);
                   }, 1000);
                });
             };
              
          };
          
      }]
   });
});
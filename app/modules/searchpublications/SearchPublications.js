define([
   'module',
   'swComponentFactory',
   'text!./SearchPublications.html',
   'less!./SearchPublications.less'
], function(module, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         oneColumn    : '=',
         extendapi    : '='
      },
      controller: [ '$scope', 'swUnifiedSettingsService',

         function($scope, swUnifiedSettingsService) {
            $scope.debounce = 0;
            $scope.extendapi = $scope.extendapi || {};
            $scope.extendapi.isTooltip = true;

            $scope.swInit = function() {};

            $scope.showLanguages = function(){
               var langs = swUnifiedSettingsService.getGroup('LibraryParameters').libraryLanguages || [];
               return langs.length > 1;
            };
         }
      ]
   });
});
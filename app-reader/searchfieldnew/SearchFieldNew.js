define([
   'module',
   'swComponentFactory',
   'text!./SearchFieldNew.html',
   'less!./SearchFieldNew.less'
], function(module, swComponentFactory, template) {
   'use strict';
   
   swComponentFactory.create({
      module : module,
      template : template,
      isolatedScope: {
         searchFn: '&',
         searchCriteria: '='
      },
      controller : ['$scope', '$timeout',
      function($scope, $timeout) {

         $scope.resetSearch = function()
         {
            $scope.searchCriteria.value = '';
         };
         
         var searchPromise;
         $scope.startNewSearch = function() {
            if (searchPromise)
            {
               $timeout.cancel(searchPromise);
            }
            searchPromise = $timeout(function()
            {
               $scope.logger.trace('! searhing for "' + $scope.searchCriteria.value + '"');
               $scope.searchFn();
            }, 500);
         };
      }]
   });
});
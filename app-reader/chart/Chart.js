define([
   'module',
   'swComponentFactory',
   'text!./Chart.html',
   'less!./Chart.less'
], function(module, swComponentFactory, template) {
   'use strict';
   
   swComponentFactory.create({
      module : module,
      template : template,
      isolatedScope: {
         model: '='
      },
      controller : ['$scope', '$filter',
      function($scope, $filter) {
         var wordFilter = function(value){
            value = parseInt(value, 10);
            value = isNaN(value) ? 0 : value;
            return Math.round(value / 100) / 10 + 'k';
         };

         var filterMap = {
            milliseconds : $filter('TimeDurationFilter'),
            words        : wordFilter
         };

         $scope.getColumnHeight = function(index)
         {
            var result = 0;
            if ($scope.model && $scope.model.values)
            {
               var value = $scope.model.values[index];
               var min = $scope.model.min;
               var max = $scope.model.max;
               result = ((value - min) / (max - min)) * 100; 
            }
            return isNaN(result) ? 0 : result;
         };
         $scope.getColumnValue = function(index)
         {
            var str = filterMap[$scope.model.type]($scope.model.values[index]);
            return ($scope.model && $scope.model.values) ? str : 0;
         };
         $scope.getMiddleHeight = function()
         {
            return $scope.model.middleHeight;
         };
      }]
   });
});
define([
   'module',
   'swComponentFactory',
   'text!./Lookup.html',
   'less!./Lookup.less'
], function(module, swComponentFactory, dictTemplate) {
   "use strict";

   swComponentFactory.create({
      module: module,
      template: dictTemplate,
      isolatedScope: {
         data: '='
      },
      controller: [ '$scope',
         function(   $scope ) {

            $scope.definition = {isLookup: true};
            $scope.swInit = function() {
               $scope.usedForSearch = $scope.data.usedForSearch;
               $scope.nothingFound = '';
               if ($scope.data.hasOwnProperty('count')) {
                  $scope.definition.searchTerm = $scope.data.term.toLowerCase();
                  $scope.definition.definitions = $scope.data;
                  $scope.definition.leftPart = $scope.data.usedForSearch.substr(0, $scope.data.usedForSearch.toLowerCase().indexOf($scope.definition.searchTerm));
                  $scope.definition.rightPart = $scope.data.usedForSearch.substr(
                     $scope.data.usedForSearch.toLowerCase().indexOf($scope.definition.searchTerm) + $scope.data.term.length, $scope.data.usedForSearch.length);
                  $scope.definition.term = $scope.data.term;
               }
               else {
                  $scope.definition.definitions = [];
                  $scope.nothingFound = 'Sorry, no results were found';
               }
            };
         }
      ]
   });
});
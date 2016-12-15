define([
   'module',
   'swComponentFactory',
   'underscore',
   'text!./DictionaryTermSearch.html',
   'less!./DictionaryTermSearch.less'
], function (module, swComponentFactory, _, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         definition: '='
      },
      controller: [
         '$scope',
         'swDictionaryService',
         function($scope,
                  swDictionaryService) {

            $scope.dictionaryTermSearchCriteria = {value: ''};
            var currentDescription;
            $scope.terms = [];
            var init = false;
            $scope.swInit = function()
            {
               $scope.termDefinitions = false;
               $scope.terms = [];
               init = false;
            };

            $scope.notFindResults = function(){
               return $scope.terms.length === 0 && init;
            };

            $scope.more = function(){
               swDictionaryService.more();
               $scope.searchDictionaryTerms($scope.dictionaryTermSearchCriteria.value);
            };

            $scope.moreThanTen = function(items){
               return items.length >= 20;
            };

            $scope.searchDictionaryTerms = function() {
               if ($scope.dictionaryTermSearchCriteria.value !== null && $scope.dictionaryTermSearchCriteria.value.length) {
                  var value = $scope.dictionaryTermSearchCriteria.value.toUpperCase();
                  $scope.selectedTerm = false;
                  //debugger;//service client - tested
                  swDictionaryService.getDictionaryTerms(value).then(function(termNames){
                     init = true;
                     if (!_.isEmpty(termNames)) {
                        $scope.terms = termNames;
                        $scope.definition.definitions = currentDescription;
                        $scope.isSearchable = true;
                     }
                     else {
                        $scope.terms = [];
                        $scope.termDefinitions = false;
                     }
                  });
               }
               else {
                  $scope.terms = [];
                  $scope.termDefinitions = false;
               }
            };

            $scope.getDictionaryDefinition = function(term) {
               $scope.selectedTerm = $scope.terms.indexOf(term);
               //debugger;//service client - tested
               swDictionaryService.getDictionaryDefinition(term).then(function(data){
                  $scope.definition.term = term;
                  $scope.definition.definitions = data;
                  currentDescription = data;
                  $scope.count = data.count.toString();
               });
            };
         }]
   });
});
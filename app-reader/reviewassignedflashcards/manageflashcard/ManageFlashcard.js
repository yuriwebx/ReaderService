define([
   'module',
   'swComponentFactory',
   'text!./ManageFlashcard.html'
], function(module, swComponentFactory, template) {
   'use strict';

   swComponentFactory.create({
      module: module,
      template: template,
      isolatedScope: {
         params: '=',
         term: '='
      },
      controller: [
         '$scope',
         '$timeout',
         'swStudyFlashcardsService',
         function($scope, $timeout, swStudyFlashcardsService) {

            $scope.isInFlashcards = function(data) {
               return data && data.inFlashcards;
            };

            $scope.saveFlashCard = function(term, properties) {
               if (!properties.inFlashcards) {

                  if (properties && properties.definitions.length) {
                     var partOfSpeech = properties.grammar.partOfspeech || 'none';

                     var flashCardData = {
                        dictionaryId       : properties.dictionaryId,
                        partOfSpeech       : partOfSpeech,
                        dictionaryTermName : term
                     };

                     //debugger;//service client - tested
                     swStudyFlashcardsService.addFlashcardStudy(flashCardData, 'Editor').then(function(data) { //TODO: check if second param needed in addFlashcardStudy()
                        if (data === 'Ok') {
                           properties.inFlashcards = true;
                        }
                        else {
                           $scope.errorSaving = true;
                           $timeout(function() {
                              $scope.errorSaving = false;
                           }, 300);
                        }
                     }).then(function() {
                        //debugger;//service client - result is not used
                        swStudyFlashcardsService.searchFlashcardStudies();
                     });
                  }
               }
            };
         }
      ]
   });

});
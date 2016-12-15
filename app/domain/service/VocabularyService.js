
define([
   'module',
   'swServiceFactory'
], function (module, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module : module,
      service : ['swUserService', 'swRestService', 'swAgentService',
         function (swUserService, swRestService, swAgentService) {

            this.updateVocabularyTermsCount = function(result){
               var data = {
                  vocabularyTermsCount: result
               };
               if (swUserService.isAuthenticated()) {
                  //swRestService.restRequest
                  //debugger;//service provider - result is not used
                  swRestService.restSwHttpRequest('post', 'Vocabulary', 'saveVocabulary', data);
               }
            };

            this.getResult = function () {
               //!!!swRestService.restRequest
               //debugger;//service provider - result is not used
               return swAgentService.request('get', 'Vocabulary', 'vocabularyResults', {});
            };
           
            this.getQuestions = function(lowerBound, upperBound, numberQuestion, numberIncorrectAnswers) {
               var data = {
                  lowerBound: lowerBound,
                  upperBound: upperBound,
                  numberQuestion: numberQuestion,
                  numberIncorrectAnswers: numberIncorrectAnswers
               };

               //!!!swRestService.restRequest
               //debugger;//service provider - result is not used
               return swRestService.restSwHttpRequest('get', 'Vocabulary', 'getQuestions', data);
            };

            this.getUpperBoundVocabulary = function(lowerBound, upperBound) {
               var data = {
                  lowerBound: lowerBound,
                  upperBound: upperBound
               };
               //!!!swRestService.restRequest
               //debugger;//service provider - result is not used
               return swRestService.restSwHttpRequest('get', 'Vocabulary', 'upperBoundVocabulary', data);
            };

            this.sendEmail = function(name, comment, result, methodName, logVocabulary){
                var data = {
                     name: name,
                     comment: comment,
                     result: result,
                     methodName: methodName,
                     logVocabulary: logVocabulary
               };
               //!!!swRestService.restRequest
               //debugger;//service provider - result is not used
               return swRestService.restSwHttpRequest('post', 'Vocabulary', 'sendEmail', data);
            };
         }]
   });
});
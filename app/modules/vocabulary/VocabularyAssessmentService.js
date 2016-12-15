define([
   'module',
   'swServiceFactory'
], function (module, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
            'swVocabularyService',
            'swAssessmentService',
            'swI18nService',
            function(swVocabularyService,
               swAssessmentService,
               swI18nService) {

         var self = this;
         var settings = {};
         var vocabularyService;
         var vocabularyServiceSettings;

         var vocabularyTermsCount = 0;
         var stateWitoutUser = ['Vocabulary'];

         this.startAssessment = function(service, serviceSettings){
            vocabularyService = service;
            vocabularyServiceSettings = serviceSettings;
            //debugger;//service client - tested
            return vocabularyService.getQuestions().then(function(result){
               if (result.data.status === 'OK') {
                  var questions = swAssessmentService.createQuestion(result.data.data.questions);
                  var state = swAssessmentService.getState();
                  if (stateWitoutUser.indexOf(state) === -1) {
                     // debugger;//service client - tested
                     return vocabularyService.getResult().then(function(response) {
                        vocabularyTermsCount = response.data.vocabularyTermsCount || 0;
                        var options = {vocabularyTermsCount : vocabularyTermsCount};
                        settings = vocabularyService.createSettings(questions, options);
                        settings.questions = [];
                        return swAssessmentService.startPlayer(self);
                     });
                  }
                  else {
                     settings = vocabularyService.createSettings(questions);
                     settings.questions = [];
                     return swAssessmentService.startPlayer(self);
                  }
               }
            }, function(){
                //TO DO processing response
            });
         };


         this.getFirstQuestion = function() {
            var question;
            if(vocabularyService.hasOwnProperty('getFirstQuestion')){
               question = vocabularyService.getFirstQuestion(settings);
            }
            else{
               question = swAssessmentService.getFirstQuestion(settings.assessmentQuestions);
               question = swAssessmentService.showInfoForTesting(question, settings); //for testing
            }
            return question;
         };


         this.getResultResponse = function() {
            var result = vocabularyService.calculateVocabularyResults();
            var state = swAssessmentService.getState();
            var response = {
               questions: [],
               finished: true,
               result: result.toString(),
               isNewResultBetter: parseInt(settings.vocabularyTermsCount, 10) < parseInt(result, 10),
               vocabulary: true,
               flashcard: false,
               vocabularyTermsCount: settings.vocabularyTermsCount,
               showResultsField: stateWitoutUser.indexOf(state) !== -1,
               stateWitoutUser: stateWitoutUser.indexOf(state) !== -1,
               vocabularyMethod: vocabularyService.getVocabularySettings().methodName
            };
            return response;
         };

         function setLogInfo(indexQuestions){
            var corr = swAssessmentService.getCorrectAnswer(settings.assessmentQuestions[settings.indexCurrentQuestion]);
            var question = settings.assessmentQuestions[settings.indexCurrentQuestion];
            var lowerBound = settings.indexUpperBound - settings.intervalLen;
            lowerBound = lowerBound > 0 ? lowerBound : 0;
            if(question && question.question && question.answers){
               settings.questions.push({
                  questions: question.question,
                  answers: question.answers,
                  correctAnswer: question.answers[corr].text,
                  currentAnswer: question.answers[indexQuestions].text,
                  interval: {lowerBound: lowerBound, upperBound: settings.indexUpperBound}
               });
            }
         }

         this.processingCorrectQuestion = function(indexQuestions) {
            setLogInfo(indexQuestions);
            return vocabularyService.processingCorrectQuestion(settings);
         };

         this.processingIncorrectQuestion = function(indexQuestions) {
            setLogInfo(indexQuestions);
            return vocabularyService.processingIncorrectQuestion(settings);
         };

         this.getCorrectAnswer = function() {
            return swAssessmentService.getCorrectAnswer(settings.assessmentQuestions[settings.indexCurrentQuestion - 1]);
         };

        /* var finishedAssessment = function() {
            vocabularyService.finishedAssessment();
         };*/

         this.initializeQuestions = function(resp){
            var response = {};
            if(vocabularyService.hasOwnProperty('initializeQuestions')){
               response = vocabularyService.initializeQuestions(resp, settings);
            }
            else{
               settings.indexCurrentQuestion = 0;
               settings.assessmentQuestions = swAssessmentService.createQuestion(resp.data.data.questions);
               response = settings.assessmentQuestions[settings.indexCurrentQuestion];
            }
            response = swAssessmentService.showInfoForTesting(response, settings);
            response.isFinished = false;
            return response;
         };

         this.closePopUp = function() {
            //need adde behavior
         };

         this.blurPopUp = function() {
            //need adde behavior
         };

         this.getAssessmentInfo = function() {
            var methodName = vocabularyService.getVocabularySettings().methodName,
                state = swAssessmentService.getState(),
                title = stateWitoutUser.indexOf(state) !== -1 ? methodName : swI18nService.getResource('AssessmentPlayer.VocabularyAssessment.label');
            return {
               title: title,
               type: 'VocabularyAssessment',
               showQuestions: false,
               vocabularyTermsCount: vocabularyTermsCount,
               showVocabularyCount: stateWitoutUser.indexOf(state) === -1 && vocabularyTermsCount !== 0,
               wait: vocabularyServiceSettings.wait
            };
         };

         this.sendEmail = function(name, comment, result){
            var methodName = vocabularyService.getVocabularySettings().methodName;
            var logVocabulary = settings.questions;
            return swVocabularyService.sendEmail(name, comment, result, methodName, logVocabulary);
         };

         }]
   });
});

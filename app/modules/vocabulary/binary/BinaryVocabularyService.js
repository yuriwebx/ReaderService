define([
   'module',
   'swServiceFactory',
   'Context'
], function (module, swServiceFactory, Context) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
         '$q',
         'swVocabularyService',
         'swAssessmentService',
         'swI18nService',
         function ($q, swVocabularyService, swAssessmentService, swI18nService) {

            var self = this;
            var settings = {};
            var assessmentSettings = Context.parameters.AssessmentSettings;
            var config = assessmentSettings.binaryVocabulary;
            var totalNumberOfWords = assessmentSettings.vocabularySettings.totalNumberOfWords;

            function Settings(vocabularyQuestion) {
               this.MAX_NUMBER_INCORRECT_ANSWERS = config.maxNumberIncorrectAnswers;
               this.NUMBER_WORDS_IN_DICT = totalNumberOfWords;

               this.assessmentQuestions = vocabularyQuestion;
               this.countCorrectAnswersInGroup = 0;
               this.countIncorrectAnswersInGroup = 0;
               this.indexCurrentQuestion = 0;

               this.intervalLen = config.intervalLen;
               this.indexUpperBound = Math.round(totalNumberOfWords / 2);
               this.maxQuestionNumbers = config.maxNumberIncorrectAnswers;
               this.boundTop = totalNumberOfWords;
               this.haveIncorrectAnswers = false;

               this.lastGroup = false;

               this.methodName = swI18nService.getResource('Vocabulary.vocabularyAssessmentBinaryAlgorithm.label');
            }


            this.getQuestions = function (/*param*/) {
               var lowerBound = config.intervaUpperBound - config.intervalLen;
               var upperBound = config.intervaUpperBound;
               var numberQuestion = config.numberQuestionsInGroup;
               var numberIncorrectAnswers = config.numberIncorrectAnswers;
               //debugger;//service client - result is not used
               return swVocabularyService.getQuestions(lowerBound, upperBound, numberQuestion, numberIncorrectAnswers);
            };

            this.createSettings = function (questions) {
               settings = new Settings(questions);
               return settings;
            };


            var finishedResponse = {isFinished: true};

            function nextGroup(result) {
               if (settings.lastGroup) {
                  finishedAssessment(result);
                  return finishedResponse;
               }
               settings.countCorrectAnswersInGroup = 0;
               settings.countIncorrectAnswersInGroup = 0;
               var halfLen = (settings.boundTop - settings.indexUpperBound) / 2;
               if (halfLen <= config.intervalLen) { // TO DO used same type
                  settings.lastGroup = true;
               }
               halfLen = Math.ceil(halfLen);
               if (result) {
                  settings.indexUpperBound = settings.indexUpperBound + halfLen;
               }
               else {
                  settings.boundTop = settings.indexUpperBound;
                  settings.indexUpperBound = settings.indexUpperBound - halfLen;
               }

               var upperBound = settings.indexUpperBound;
               var lowerBound = settings.indexUpperBound - config.intervalLen;
               var numberQuestion = config.numberQuestionsInGroup;
               var numberIncorrectAnswers = config.numberIncorrectAnswers;
               settings.indexCurrentGroup = settings.indexUpperBound;
               //debugger;//service client - result is not used
               return swVocabularyService.getQuestions(lowerBound, upperBound, numberQuestion, numberIncorrectAnswers);
            }

            function processingUserAnswer() {
               var response = {};
               settings.indexCurrentQuestion++;
               if (settings.countIncorrectAnswersInGroup >= settings.MAX_NUMBER_INCORRECT_ANSWERS) {
                  return nextGroup(false);
               }
               else if (settings.countCorrectAnswersInGroup === settings.maxQuestionNumbers) {
                  return nextGroup(true);
               }
               response = settings.assessmentQuestions[settings.indexCurrentQuestion];
               response = swAssessmentService.showInfoForTesting(response, settings);
               response.isFinished = false;
               return response;
            }

            this.calculateVocabularyResults = function (result) {
               var halfLen = Math.round(settings.boundTop - settings.indexUpperBound);
               if (result) {
                  return settings.indexUpperBound + halfLen;
               }
               else {
                  return  settings.indexUpperBound - halfLen < config.intervalLen ? 0 : settings.indexUpperBound - halfLen;
               }
            };

            this.processingCorrectQuestion = function (settings) {
               settings.countCorrectAnswersInGroup++;
               return processingUserAnswer();
            };

            this.processingIncorrectQuestion = function (settings) {
               settings.countIncorrectAnswersInGroup++;
               return processingUserAnswer();
            };

            this.getCorrectAnswer = function () {
               return swAssessmentService.getCorrectAnswer(settings.assessmentQuestions[settings.indexCurrentQuestion - 1]);
            };

            var finishedAssessment = function (result) {
               self.calculateVocabularyResults(result);
            };

            this.getVocabularySettings = function () {
               return settings;
            };

            this.getResult = function ()
            {
               var deferred = $q.defer();

               //TODO: temp solution. Provide assessment results saving
               deferred.resolve({
                  data: {}
               });

               return deferred.promise;
            };
         }]
   });
});

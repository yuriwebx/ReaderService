define([
   'module',
   'swServiceFactory',
   'Context'
], function (module, swServiceFactory, Context) {
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
         var assessmentSettings = Context.parameters.AssessmentSettings;
         var config = assessmentSettings.directVocabulary;
         var totalNumberOfWords = assessmentSettings.vocabularySettings.totalNumberOfWords;

         function Settings(vocabularyQuestion, options) {
            if(options){ //TODO: use condition without user login more clear
               this.vocabularyTermsCount = options.vocabularyTermsCount;
            }
            this.MAX_NUMBER_INCORRECT_ANSWERS = config.maxNumberIncorrectAnswers;
            this.NUMBER_QUESTIONS_IN_GROUP = config.numberQuestionsInGroup;
            this.NUMBER_WORDS_IN_DICT = totalNumberOfWords;

            this.numberCorrectAnswers = config.numberCorrectAnswers;
            this.maxNumberCorrectAnswers = config.maxNumberCorrectAnswers;
            this.maxQuestionNumbers = config.numberCorrectAnswers;
            

            this.assessmentQuestions = vocabularyQuestion;
            this.countCorrectAnswersInGroup = 0;
            this.countIncorrectAnswersInGroup = 0;
            this.indexCurrentQuestion = 0;
            this.indexCurrentGroup = 1;
            this.intervalLen = config.intervalLen;
            this.indexUpperBound = config.intervalLen;

            this.boundTop = totalNumberOfWords;
            this.haveIncorrectAnswers = false;
            this.methodName = swI18nService.getResource('Vocabulary.vocabularyAssessmentDirectAlgorithm.label');
         }

         this.getQuestions = function(){
            var lowerBound = 0;
            var upperBound = config.intervalLen;
            var numberQuestion = config.numberQuestionsInGroup;
            var numberIncorrectAnswers = config.maxNumberIncorrectAnswers;
            //debugger;//service client - result is not used
            return swVocabularyService.getQuestions(lowerBound, upperBound, numberQuestion, numberIncorrectAnswers);
         };

         this.createSettings = function(questions, options){
            settings = new Settings(questions, options);
            return settings;
         };

         this.getResult = function(){
            //debugger;//service client - result is not used
            return swVocabularyService.getResult();
         };

         var finishedResponse = {
            isFinished: true
         };

         function nextGroup() {
            settings.indexCurrentGroup++;
            settings.countCorrectAnswersInGroup = 0;
            settings.countIncorrectAnswersInGroup = 0;
            settings.haveIncorrectAnswers = false;
            settings.maxQuestionNumbers = settings.numberCorrectAnswers;
            if(settings.indexUpperBound >= settings.boundTop){
               finishedAssessment();
               return finishedResponse;
            }
            var lowerBound = settings.indexUpperBound;
            settings.indexUpperBound += settings.intervalLen;
            var upperBound = settings.indexUpperBound;
            var numberQuestion = config.numberQuestionsInGroup;
            var numberIncorrectAnswers = config.maxNumberIncorrectAnswers;
            //debugger;//service client - result is not used
            return swVocabularyService.getQuestions(lowerBound, upperBound, numberQuestion, numberIncorrectAnswers);
         }

         function processingUserNeverMistake(){
            var response = {};
            settings.indexCurrentQuestion++;
            if(settings.indexCurrentQuestion === settings.maxQuestionNumbers){
               return nextGroup();
            }
            else{
               response = settings.assessmentQuestions[settings.indexCurrentQuestion];
               response.isFinished = false;
               response = swAssessmentService.showInfoForTesting(response, settings);//for testing
               return response;
            }
         }

         function processingUserMakeMistake(){
            var response = {};
            settings.indexCurrentQuestion++;
            settings.maxQuestionNumbers = settings.maxNumberCorrectAnswers;
            if(settings.countIncorrectAnswersInGroup >= settings.MAX_NUMBER_INCORRECT_ANSWERS){
               finishedAssessment();
               return finishedResponse;
            }
            else if(settings.countCorrectAnswersInGroup === settings.maxQuestionNumbers){
               return nextGroup();
            }
            response = settings.assessmentQuestions[settings.indexCurrentQuestion];
            response.isFinished = false;
            response = swAssessmentService.showInfoForTesting(response, settings);//for testing
            return response;
         }

         this.calculateVocabularyResults = function(){
            return settings.indexUpperBound - settings.intervalLen;
         };

         this.processingCorrectQuestion = function(settings) {
            settings.countCorrectAnswersInGroup++;
            if (settings.haveIncorrectAnswers) {
               return processingUserMakeMistake();
            }
            else {
               return processingUserNeverMistake();
            }
         };

         this.processingIncorrectQuestion = function(settings) {
            settings.haveIncorrectAnswers = true;
            settings.countIncorrectAnswersInGroup++;
            return processingUserMakeMistake();
         };

         this.getCorrectAnswer = function(){
               return swAssessmentService.getCorrectAnswer(settings.assessmentQuestions[settings.indexCurrentQuestion - 1]);
            };

         var finishedAssessment = function() {
            var response = self.calculateVocabularyResults();
            var state = swAssessmentService.getState();
            if(state !== 'Vocabulary'){
               //debugger;//service client - result is not used
               swVocabularyService.updateVocabularyTermsCount(response);
            }
         };

         this.getVocabularySettings = function(){
            return settings;
         };

         }]
   });
});

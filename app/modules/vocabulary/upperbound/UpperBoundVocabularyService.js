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
         var config = assessmentSettings.upperboundVocabulary;
         var totalNumberOfWords = assessmentSettings.vocabularySettings.totalNumberOfWords;

         function Settings(vocabularyQuestion) {
            var intervalLen = Math.round(totalNumberOfWords / config.totalNumberQuestion);
            this.NUMBER_WORDS_IN_DICT =  totalNumberOfWords;

            this.assessmentQuestions = vocabularyQuestion;
            this.indexCurrentQuestion = 0;
            this.currentWordInterval = 0;
            this.indexGroup = 0;
            this.boundTop = totalNumberOfWords;
            this.haveIncorrectAnswers = false;
            this.isFirstQuestion = true;
            this.isSecondGroup = false;

            this.results = {
               correctAnswerIndex: [],
               incorrectAnswerIndex: []
            };
            this.NUMBER_GROUP = config.numberGroup;

            this.totalNumberQuestion = config.totalNumberQuestion;
            this.intervalLen = intervalLen;
            this.indexUpperBound = intervalLen;
            this.numberIncorrectAnswerSecondGroup = config.numberIncorrectAnswerSecondGroup;
            this.methodName = swI18nService.getResource('Vocabulary.vocabularyAssessmenUpperAlgorithm.label');
         }


         this.getQuestions = function(/*param*/) {
            var lowerBound = 0;
            var upperBound = Math.round(totalNumberOfWords / config.totalNumberQuestion);
            var numberQuestion = config.numberQuestionsInGroup;
            var numberIncorrectAnswers = config.numberIncorrectAnswers;
            //debugger;//service client - result is not used
            return swVocabularyService.getQuestions(lowerBound, upperBound, numberQuestion, numberIncorrectAnswers);
         };

         function addIncorrectAnswer(questions){
            for(var i = 0; i < questions.length; i++){
               questions[i].answers.push({correct: false, text: swI18nService.getResource('Vocabulary.IdontNo.label')}); //TO DO add in swI18nService
            }
            return questions;
         }

         this.createSettings = function(questions){
            questions = addIncorrectAnswer(questions);
            settings = new Settings(questions);
            return settings;
         };

			this.getFirstQuestion = function(settings) {
				if (settings.isFirstQuestion) {
					var question = swAssessmentService.getFirstQuestion(settings.assessmentQuestions);
					settings.isFirstQuestion = false;
					question = swAssessmentService.showInfoForTesting(question, settings); //for testing
					return question;
				}
				else {
					return nextGroup();
				}

			};

			function processingVocabularyResults() {
            var lenCorrect = settings.results.correctAnswerIndex.length,
                lenIncorrect = settings.results.incorrectAnswerIndex.length,
                correctAnswerIndex = settings.results.correctAnswerIndex.length !== 0 ? settings.results.correctAnswerIndex : [0],
                incorrectAnswerIndex = settings.results.incorrectAnswerIndex.length !== 0 ? settings.results.incorrectAnswerIndex : [0],
                upperBound,
                lowerBound;

            var max = Math.max.apply(Math,correctAnswerIndex);
            var min = Math.min.apply(Math,incorrectAnswerIndex);
            if(max > min){
               upperBound = max;
               lowerBound = lenIncorrect !== 0 ? min : max - 1;
            }
            else{
               upperBound = lenCorrect !== 0 ? max + 1 : 1;
               lowerBound = lenCorrect !== 0 ? max - 1 : 0;
            }
				return [upperBound, lowerBound];
			}

         var finishedResponse = {isFinished : true};
         function nextGroup(){
            var response = processingVocabularyResults();
            settings.results = {
               correctAnswerIndex: [],
               incorrectAnswerIndex: []
            };
            settings.boundTop = response[0] * settings.intervalLen;
            settings.indexUpperBound = response[1] * settings.intervalLen;
            settings.intervalLen = Math.round((response[0] - response[1]) * settings.intervalLen / settings.totalNumberQuestion);
            var upperBound = settings.indexUpperBound;
            var lowerBound = upperBound - settings.intervalLen;
            var numberQuestion = config.numberQuestionsInGroup;
            var numberIncorrectAnswers = config.numberIncorrectAnswers;
            settings.currentWordInterval = 0;
            //debugger;//service client - result is not used
            return swVocabularyService.getQuestions(lowerBound, upperBound, numberQuestion, numberIncorrectAnswers);
         }

         function processingUserAnswer(settings){
            var response = {};
            settings.indexCurrentQuestion++;
            if(settings.indexCurrentQuestion === settings.assessmentQuestions.length){
               var lowerBound = settings.indexUpperBound;
               settings.indexUpperBound += settings.intervalLen;
               if(settings.indexUpperBound >= settings.boundTop ||
                (settings.isSecondGroup && settings.results.incorrectAnswerIndex.length === settings.numberIncorrectAnswerSecondGroup)){

                  settings.indexGroup++;
                  if(settings.indexGroup === settings.NUMBER_GROUP){
                     finishedAssessment();
                     return finishedResponse;
                  }
                  else{
                     settings.isSecondGroup = true;
                     return {nextGroup : true};
                  }
               }
               else{
                  var upperBound = settings.indexUpperBound;
                  var numberQuestion = config.numberQuestionsInGroup;
                  var numberIncorrectAnswers = config.numberIncorrectAnswers;
                  //debugger;//service client - result is not used
                  return swVocabularyService.getQuestions(lowerBound, upperBound, numberQuestion, numberIncorrectAnswers);
               }
            }
            else{
               response = settings.assessmentQuestions[settings.indexCurrentQuestion];
               response = swAssessmentService.showInfoForTesting(response, settings);//for testing
               response.isFinished = false;
               return response;
            }
         }

         this.calculateVocabularyResults = function(){
            var max = Math.max.apply(this,settings.results.correctAnswerIndex.length !== 0 ? settings.results.correctAnswerIndex : [0]);
            if(max !== 0){
               return settings.boundTop - (config.totalNumberQuestion - max) * settings.intervalLen;
            }
            else{
               return settings.indexUpperBound - settings.intervalLen * settings.results.incorrectAnswerIndex.length;
            }
         };

         function setPositionIndex(resultsObj){
            settings.currentWordInterval++;
            resultsObj.push(settings.currentWordInterval);
         }

         this.processingCorrectQuestion = function(settings) {
            setPositionIndex(settings.results.correctAnswerIndex);
            return processingUserAnswer(settings);
         };

         this.processingIncorrectQuestion = function(settings) {
            setPositionIndex(settings.results.incorrectAnswerIndex);
            return processingUserAnswer(settings);
         };

         var finishedAssessment = function() {
            self.calculateVocabularyResults();
         };

         this.getVocabularySettings = function(){
            return settings;
         };

         this.initializeQuestions = function(resp, settings){
            var response = {};
            var questions = swAssessmentService.createQuestion(resp.data.data.questions);
            settings.indexCurrentQuestion = 0;
            questions = addIncorrectAnswer(questions);
            settings.assessmentQuestions = questions;
            response = settings.assessmentQuestions[settings.indexCurrentQuestion];
            return response;
         };

         }]
   });
});

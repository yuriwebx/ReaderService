define([
   'module',
   'Context',
   'swServiceFactory',
   'underscore'
], function (module, Context, swServiceFactory, _) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
         'swAssessmentPlayer',
         'swAssessmentPlayerService',
         'swSubmachine',
         function(swAssessmentPlayer,
                  swAssessmentPlayerService,
                  swSubmachine) {
            var self = this;

            this.startPlayer = function(service){
               swAssessmentPlayerService.init(service);
               return swAssessmentPlayer.startAssessmentPlayer();
            };

            this.getFirstQuestion = function(assessmentQuestions){
              if(assessmentQuestions){
                return assessmentQuestions[0];
              }
            };

            this.getCorrectAnswer = function(assessmentQuestion){
              if(assessmentQuestion && assessmentQuestion.answers){
                return  _.indexOf(_.pluck(assessmentQuestion.answers, 'correct'), true);
              }
            };

            this.createQuestion = function(data){
              data = _.map(data, function(element) {
                element.answers = [];
                for(var el in element.incorrectAnswers){
                  if(element.incorrectAnswers.hasOwnProperty(el)){
                    element.answers.push({text: element.incorrectAnswers[el],correct: false});
                  }
                }
                element.answers.push({text: element.answer, correct: true});
                element.answers = _.shuffle(element.answers);
                return element;
              });
              return data;
            };

            // showInfoForTesting added for testsing in:
            // swDirectVocabularyService,
            // swBinaryVocabularyService,
            // swUpperBoundVocabularyService
            this.showInfoForTesting = function(question, settings) {
              if(question && question.answers && settings){
                var isDevelop = !Context.parameters.isPublic;
                return _.extend(question, {
                   testing: isDevelop,
                   testingInfo: {
                      currentGroup: settings.indexUpperBound,
                      currentQuestion: settings.indexCurrentQuestion,
                      TotalWords: settings.NUMBER_WORDS_IN_DICT,
                      correctAnswer: question.answers[self.getCorrectAnswer(question)].text
                   }
                });
              }
            };

            this.getState = function() {
               return swSubmachine.getStack().length && swSubmachine.getStack()[0].currState;
            };
         }]
   });
});
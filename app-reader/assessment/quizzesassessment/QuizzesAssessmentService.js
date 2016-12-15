define([
   'module',
   'underscore',
   'swServiceFactory'
], function (module, _, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
         '$q',
         'swManageTestsService',
         'swAssessmentService',
         'swContextPopupService',
         function ($q, swManageTestsService, swAssessmentService, swContextPopupService) {

            var self = this, responseDefered,
                settings = {};

            function Settings(questions, quiz) {
               this.assessmentQuestions = questions;
               this.quiz = quiz;
               this.currentIndex = 0;
               this.userAnswersArr = [];
               this.correctCounter = 0;
               this.title = quiz.name;
            }

            this.startAssessment = function (testId, publicationId) {
               responseDefered = $q.defer();
               //debugger;//service client - NOT TESTED
               swManageTestsService.getTest(testId, publicationId).then(function(quiz){
                  var questions = swAssessmentService.createQuestion(quiz.testQuestions);
                  settings = new Settings(questions, quiz);
               swAssessmentService.startPlayer(self);
               },function(){
                  // TO DO add behavior
               });
               return responseDefered.promise;
            };

            this.getFirstQuestion = function(){
               return swAssessmentService.getFirstQuestion(settings.assessmentQuestions);
            };
            var finishedResponse = {isFinished : true};
            this.processingCorrectQuestion = function () {
               var response = {};
               setUserAnswersData(settings.assessmentQuestions[settings.currentIndex], true);
               settings.currentIndex++;
               if (settings.currentIndex !== settings.assessmentQuestions.length) {
                  response = settings.assessmentQuestions[settings.currentIndex];
                  response.isFinished = false;
                  return response;
               }
               else {
                  saveResults(settings.userAnswersArr);
                  return finishedResponse;
               }
            };

            function setUserAnswersData(data, result) {
               settings.userAnswersArr.push({
                  playedTest: data,
                  correct: result
               });
            }

            this.processingIncorrectQuestion = function () {
               var response = {};
               setUserAnswersData(settings.assessmentQuestions[settings.currentIndex], false);
               settings.currentIndex++;
               if (settings.currentIndex !== settings.assessmentQuestions.length) {
                  response = settings.assessmentQuestions[settings.currentIndex];
                  response.isFinished = false;
                  return response;
               }
               else {
                  saveResults(settings.userAnswersArr);

                  return finishedResponse;
               }
            };

            this.getResultResponse = function () {
               return {
                  flashcard: false,
                  vocabulary: false,
                  quiz: true,
                  allQwestions: settings.assessmentQuestions.length,
                  correctAnswer: settings.correctCounter
               };
            };

            this.getCorrectAnswer = function () {
               return swAssessmentService.getCorrectAnswer(settings.assessmentQuestions[settings.currentIndex - 1]);
            };

            function saveResults(answersArr){
               settings.correctCounter = 0;

               _.each(answersArr, function (answer) {
                  if (answer.correct) {
                     settings.correctCounter++;
                  }
               });
               responseDefered.resolve({
                  id : settings.quiz._id,
                  locator : settings.quiz.locator,
                  correctAnswersCount : settings.correctCounter,
                  totalAnswersCount: answersArr.length
               });

               settings.quiz.correctAnswersCount = settings.correctCounter; //TODO: probably need to find better solution
               settings.quiz.status =
                  settings.quiz.correctAnswersCount < settings.quiz.testQuestionsCount ? 'Partial' : 'Completed';
               swContextPopupService.updateExercise(settings.quiz);
            }

            this.closePopUp = function () {
               saveResults(settings.userAnswersArr);
            };

            this.getAssessmentInfo = function(){
               return {
                  title: settings.title,
                  type: 'Quizzes',
                  showQuestions: true,
                  vocabularyTermsCount: 0,
                  numberQuestion: settings.assessmentQuestions.length,
                  showVocabularyCount: false,
                  wait : true
               };
            };

            this.blurPopUp = function(){
               saveResults(settings.userAnswersArr);
            };

            this.playAudio = function (audioId) {
               //debugger;//service client - result is not used
               return swManageTestsService.getTestFileSource(audioId);
            };

            this.getImage = function (imageId) {
               //debugger;//service client - result is not used
               return swManageTestsService.getTestFileSource(imageId);
            };
         }]
   });
});
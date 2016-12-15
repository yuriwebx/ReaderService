define([
   'module',
   'swServiceFactory'
], function (module, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
         'swStudyFlashcardsService',
         'swReviewAssignedFlashcardsComponentService',
         'swAssessmentService',
         'swI18nService',
         'swManageTestsService',
         function(swStudyFlashcardsService,
                  swReviewAssignedFlashcardsComponentService,
                  swAssessmentService,
                  swI18nService,
                  swManageTestsService) {

            var self = this;
            var settings = {};
            var isStartInitiateFlashcard = false;

            function Settings(flashcardQuestion, flashCardStudyIds, flashCard){
               this.assessmentQuestions = flashcardQuestion;
               this.currentIndex = 0;
               this.userAnswersArr = [];
               this.flashCardStudyIds = flashCardStudyIds;
               this.flashCard = flashCard;
            }

            this.startAssessment = function(flashCardStudyIds, flashCardQuiz) {
               if (flashCardStudyIds.length !== 0 && !isStartInitiateFlashcard) {
                  isStartInitiateFlashcard = true;
                  //debugger;//service client - tested
                  swStudyFlashcardsService.initiateFlashcardsStudy(flashCardStudyIds).then(function(flashCard)
                     {
                        isStartInitiateFlashcard = false;
                        var flashcardQuestion;
                        if (flashCard.length !== 0) {
                           flashcardQuestion = swAssessmentService.createQuestion(flashCard);
                           settings = new Settings(flashcardQuestion, flashCardStudyIds, flashCardQuiz);
                           swAssessmentService.startPlayer(self);
                        }
                     }, function(){
                        isStartInitiateFlashcard = false;
                     });
               }
            };

            this.getFirstQuestion = function(){
               return swAssessmentService.getFirstQuestion(settings.assessmentQuestions);
            };

            function setUserAnswersData(flashCardStudyId, result)
            {
               var answer = {
                  flashcardStudyId: flashCardStudyId,
                  passed: result
               };
               settings.userAnswersArr.push(answer);
               saveResults(answer);
            }

            var finishedResponse = {isFinished : true};
            function processingAnswer(answer){
               var response = {};
               setUserAnswersData(settings.flashCardStudyIds[settings.currentIndex], answer);
               settings.currentIndex++;
               if(settings.currentIndex !== settings.assessmentQuestions.length){
                  response = settings.assessmentQuestions[settings.currentIndex];
                  response.isFinished = false;
                  return response;
               }
               else{
                  return finishedResponse;
               }
            }

            this.processingCorrectQuestion = function(){
               var answer = true;
               return processingAnswer(answer);
            };


            this.processingIncorrectQuestion = function(){
               var answer = false;
                return processingAnswer(answer);
            };

            this.getResultResponse = function(){
               var response = {
                  flashcard: true,
                  vocabulary: false
               };
               return response;
            };

            this.getCorrectAnswer = function(){
               return swAssessmentService.getCorrectAnswer(settings.assessmentQuestions[settings.currentIndex - 1]);
            };

            function saveResults(updateQuestions){
               //debugger;//service client - result is not used
               swStudyFlashcardsService.searchFlashcardStudies(); //TO DO chack relevance of Use
               //debugger;//service client - result is not used
               swReviewAssignedFlashcardsComponentService.onFlashCardsClose(swStudyFlashcardsService.updateFlashcardStudy(updateQuestions));
            }

            this.closePopUp = function(){
//               saveResults(settings.userAnswersArr);
            };

            this.getAssessmentInfo = function(){
               return {
                  title: swI18nService.getResource('AssessmentPlayer.FlashCardsAssessment.label'),
                  type: 'FlashCardsAssessment',
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
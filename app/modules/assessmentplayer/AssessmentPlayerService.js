define([
   'module',
   'swServiceFactory'
], function (module, swServiceFactory) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
         function () {
            var assessmentService;

            this.init = function(service){
               assessmentService = service;
            };

            this.getFirstQuestion = function(index){
               return assessmentService.getFirstQuestion(index);
            };

            this.processingCorrectQuestion = function(index){
               return assessmentService.processingCorrectQuestion(index);
            };

            this.processingIncorrectQuestion = function(index){
               return assessmentService.processingIncorrectQuestion(index);
            };

            this.getResultResponse = function(){
               return assessmentService.getResultResponse();
            };

            this.getCorrectAnswer = function(){
               return  assessmentService.getCorrectAnswer();
            };

            this.closePopUp = function(assessmentPlayer){
               assessmentService.closePopUp(assessmentPlayer);
            };

            this.getAssessmentInfo = function(){
               return assessmentService.getAssessmentInfo();
            };
            
            this.initializeQuestions = function(questions){
               return assessmentService.initializeQuestions(questions); //TO DO function for async case
            };

            this.blurPopUp = function(){
               assessmentService.blurPopUp();
            };

            this.playAudio = function(audioId){
               return assessmentService.playAudio(audioId);
            };

            this.getImage = function (imageId)
            {
               return assessmentService.getImage(imageId);
            };

            this.sendEmail = function(name, comment, result){
              return assessmentService.sendEmail(name, comment, result);
            };
         }]
   });
});
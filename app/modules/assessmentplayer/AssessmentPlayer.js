define([
   'module',
   'swServiceFactory',
   'text!./AssessmentPlayer-header.html',
   'text!./AssessmentPlayer-content.html',
   'text!./AssessmentPlayer-footer.html',
   'less!./AssessmentPlayer.less'
], function (module, swServiceFactory, header, content, footer) {
   'use strict';

   swServiceFactory.create({
      module: module,
      service: [
         '$timeout',
         'swPopupService',
         'swAssessmentPlayerService',
         'swI18nService',
         function ($timeout, swPopupService,
                   swAssessmentPlayerService, swI18nService) {

            var assessmentPlayer,
                audioElement = false;

            this.startAssessmentPlayer = function()
            {
               if (!assessmentPlayer || assessmentPlayer.isHidden())
               {
                  var info = swAssessmentPlayerService.getAssessmentInfo();

                  assessmentPlayer = swPopupService.show({
                     customClass: 'assessment-player-popup',
                     extendScope: getScope(swAssessmentPlayerService, info),
                     header: header,
                     content: content,
                     footer: footer,
                     backdropVisible: true,
                     layout: {}
                  });

                  return assessmentPlayer.promise
                      .then(function () {
                        if(audioElement){
                           audioElement.pause();
                        }
                        swAssessmentPlayerService.blurPopUp();
                      });
               }
            };

            function getScope(playerService, info){
               var scope = {};
               var assessmentPlayerService = playerService;
               var TIME_DELAY = 300;
               var START_INDEX = 0;
               var response;
               var waitCorrectAnswer = info.wait;
               scope.playerScope = {
                  answers: [],
                  testFinished: false,
                  userCorrectAnswers: [],
                  userIncorrectAnswers: [],
               };

               scope.playerScope.swInit = function ()
               {
                  scope.playerScope.activeItemIndex = START_INDEX;
                  scope.playerScope.selected = {};
                  scope.playerScope.assessmentItem = assessmentPlayerService.getFirstQuestion(START_INDEX);
                  showImgPreview();


                  setInfoForTest(scope.playerScope.assessmentItem);//for testing
               };

               scope.playerScope.swInit();

               function showImgPreview ()
               {
                  scope.playerScope.isImage = scope.playerScope.assessmentItem.image ? true : false;
                  if (scope.playerScope.isImage)
                  {
                     scope.playerScope.src = assessmentPlayerService.getImage(scope.playerScope.assessmentItem.image);
                  }
                  else
                  {
                     scope.playerScope.src = '#';
                  }
               }

               function isPromise (data)
               {
                  return data.hasOwnProperty('$$state');
               }

               function getAssessmentResult ()
               {
                  response = assessmentPlayerService.getResultResponse(scope.playerScope.resultVocabularyAssessment, scope.playerScope.numberWords);

                  scope.playerScope.testFinished = true;
                  scope.playerScope.showFlashCardsResults = response.flashcard;
                  scope.playerScope.showVocabularyResults = response.vocabulary;
                  scope.playerScope.showQuizResults = response.quiz;
                  scope.playerScope.vocabularyTermsCount = response.vocabularyTermsCount;
                  scope.playerScope.isNewResultBetter = response.isNewResultBetter;


                  scope.playerScope.resultVocabularyAssessment = response.result;
                  scope.playerScope.isNewResulBetter = response.isNewResulBetter;
                  scope.playerScope.activeItemIndex = info.numberQuestion - 1;
                  scope.playerScope.allQwestions = response.allQwestions;
                  scope.playerScope.correctAnswer = response.correctAnswer;
                  scope.playerScope.isSuccess = response.correctAnswer >= Math.round(0.8 * response.allQwestions);

                  scope.playerScope.showResultsField = response.showResultsField;
                  scope.playerScope.stateWitoutUser = response.stateWitoutUser;
                  scope.playerScope.vocabularyMethod = response.vocabularyMethod;
               }

               scope.getNextGroup = function(){
                  response = assessmentPlayerService.getFirstQuestion();
                  scope.playerScope.nextGroup = false;
                  scope.playerScope.haveQuestion = false;
                  if(isPromise(response) || response.status !== 'Finished'){
                     showNextQuestion();
                  }
                  else{
                     getAssessmentResult();
                  }

               };

               function showNextGroup(){
                  scope.playerScope.nextGroup = true;
               }


               //for testing
               function setInfoForTest(data){
                  scope.playerScope.infoForTest = {};
                  scope.playerScope.infoForTestShow = data.testing;
                  scope.playerScope.infoForTest = data.testingInfo;
               }

               function showNextQuestion()
               {
                  if (isPromise(response))
                  {
                     response.then(function(resp){
                        scope.playerScope.assessmentItem = assessmentPlayerService.initializeQuestions(resp);
                        scope.info = swAssessmentPlayerService.getAssessmentInfo();

                        setInfoForTest(scope.playerScope.assessmentItem);//for testing
                        selected = true;
                     });
                  }
                  else
                  {
                     scope.playerScope.assessmentItem = response;
                     setInfoForTest(response);//for testing
                     selected = true;
                  }
                  showImgPreview();

                  response = false;

                  scope.playerScope.selected = {};

                  if (audioElement)
                  {
                     audioElement.pause();
                     audioElement = false;
                  }
               }


               scope.playerScope.haveQuestion = false;

               response = false;

            var selected = true;
            scope.playerScope.selectAnswer = function(answerCurrent, index) {
               if (audioElement)
               {
                  audioElement.pause();
               }
               if (selected) {
                  selected = false;
                  if (answerCurrent.correct && !response.isFinished && !response.nextGroup) {
                     if (!scope.playerScope.haveQuestion) {
                        response = assessmentPlayerService.processingCorrectQuestion(index);
                     }
                     scope.playerScope.haveQuestion = false;
                  }
                  else if (!response.isFinished && !response.nextGroup) {
                     if (!scope.playerScope.haveQuestion) {
                        response = assessmentPlayerService.processingIncorrectQuestion(index);
                     }

                     scope.playerScope.haveQuestion = true;
                     scope.playerScope.selected.correct = assessmentPlayerService.getCorrectAnswer();
                  }
                  // set visual answer
                  if(answerCurrent.correct){
                     scope.playerScope.selected.correct = index;
                  }
                  else{
                     scope.playerScope.selected.incorrect = index;
                  }
                  $timeout(function() {
                     if (scope.playerScope.haveQuestion && waitCorrectAnswer && !response.nextGroup && !answerCurrent.isFinished && !answerCurrent.correct) {
                        selected = true;
                        return;
                     }

                     if (response.isFinished) {
                        getAssessmentResult();
                     }
                     else if (response.nextGroup) {
                        showNextGroup();
                     }
                     else {
                        scope.playerScope.activeItemIndex++;
                        scope.playerScope.haveQuestion = false;
                        setInfoForTest(response); //for testing
                        showNextQuestion();
                     }
                  }, TIME_DELAY);
               }
            };

               scope.playerScope.close = function()
               {
                  if(audioElement){
                     audioElement.pause();
                  }
                  assessmentPlayerService.closePopUp();
                  assessmentPlayer.hide(1);
               };

               scope.playerScope.playAudio = function ()
               {
                  if (!audioElement) {
                     audioElement = new Audio(assessmentPlayerService.playAudio(scope.playerScope.assessmentItem.audio));// jshint ignore:line
                  }

                  audioElement.load();
                  audioElement.play();
               };

               scope.info = info;

               scope.getAssessmentPlayerLocalizedName = function ()
               {
                  return swI18nService.getResource('AssessmentPlayer.' + scope.info.type + '.label');
               };

               scope.playerScope.profile = {};
               scope.sendEmail = function(){
                  var name = scope.playerScope.profile.name || '';
                  var comment = scope.playerScope.profile.comment || '';
                  if(name.length !== 0){
                     assessmentPlayerService.sendEmail(name, comment, response.result).then(function(response){
                        if(response.data.status === 'OK'){
                           scope.playerScope.errorMessage = false;
                           scope.playerScope.showResultsField = false;
                           scope.playerScope.showErrorResponse = false;
                           scope.playerScope.showEmailResponse = true;
                        }
                     }, function(){
                        scope.playerScope.errorMessage = false;
                        scope.playerScope.showErrorResponse = true;
                     });
                  }
                  else{
                     scope.playerScope.errorMessage = true;
                  }
               };

               return scope;
            }
         }]
   });
});